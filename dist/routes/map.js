"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/map.ts
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /map/pois
 * Search/get POIs with filters
 *
 * Query Parameters:
 * - lat, lng: Center point for search
 * - radius: Search radius in meters (default: 50000 = 50km)
 * - type: Filter by place type (e.g., "campground", "park")
 * - region: Filter by region code (e.g., "VIC", "SA")
 * - limit: Max results (default: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get("/pois", async (req, res) => {
    try {
        const { lat, lng, radius, bbox, type, region, limit = 100, offset = 0 } = req.query;
        let query = supabase_1.supabase
            .from("pois")
            .select("*")
            .eq("is_active", true);
        // Filter by region
        if (region) {
            query = query.eq("region_code", region);
        }
        // Filter by type
        if (type) {
            query = query.eq("place_type", type);
        }
        // Bounding box search (bbox format: "west,south,east,north")
        if (bbox) {
            const bboxParts = bbox.split(",");
            if (bboxParts.length === 4) {
                const [west, south, east, north] = bboxParts.map(parseFloat);
                query = query
                    .gte("lng", west)
                    .lte("lng", east)
                    .gte("lat", south)
                    .lte("lat", north);
            }
        }
        // If lat/lng provided (alternative to bbox), we'll filter by distance after fetching
        else if (lat && lng) {
            const centerLat = parseFloat(lat);
            const centerLng = parseFloat(lng);
            const searchRadius = radius ? parseFloat(radius) : 50000;
            // Simple bounding box approximation (1 degree ≈ 111km)
            const latDelta = searchRadius / 111000;
            const lngDelta = searchRadius / (111000 * Math.cos(centerLat * Math.PI / 180));
            query = query
                .gte("lat", centerLat - latDelta)
                .lte("lat", centerLat + latDelta)
                .gte("lng", centerLng - lngDelta)
                .lte("lng", centerLng + lngDelta);
        }
        // Pagination
        const limitNum = Math.min(parseInt(limit) || 100, 200); // Max 200
        const offsetNum = parseInt(offset) || 0;
        query = query
            .limit(limitNum)
            .range(offsetNum, offsetNum + limitNum - 1);
        const { data: pois, error } = await query;
        if (error) {
            console.error("Error fetching POIs:", error);
            return res.status(500).json({ error: "Failed to fetch POIs" });
        }
        // If lat/lng provided, calculate distance and sort
        let poisWithDistance = pois || [];
        if (lat && lng && pois) {
            const centerLat = parseFloat(lat);
            const centerLng = parseFloat(lng);
            poisWithDistance = pois.map((poi) => {
                // Haversine distance calculation
                const R = 6371000; // Earth radius in meters
                const dLat = (poi.lat - centerLat) * Math.PI / 180;
                const dLng = (poi.lng - centerLng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(centerLat * Math.PI / 180) * Math.cos(poi.lat * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;
                return {
                    ...poi,
                    distance: Math.round(distance), // Distance in meters
                };
            }).sort((a, b) => a.distance - b.distance);
        }
        return res.json({
            success: true,
            pois: poisWithDistance,
            count: poisWithDistance.length,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * GET /map/pois/:id
 * Get POI details by ID
 */
router.get("/pois/:id", async (req, res) => {
    try {
        const poiId = req.params.id;
        const { data: poi, error } = await supabase_1.supabase
            .from("pois")
            .select("*")
            .eq("id", poiId)
            .eq("is_active", true)
            .single();
        if (error || !poi) {
            return res.status(404).json({ error: "POI not found" });
        }
        // If user is authenticated, include visit/bookmark status
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.replace("Bearer ", "");
            const { data: userData } = await supabase_1.supabase.auth.getUser(token);
            if (userData?.user) {
                const userId = userData.user.id;
                // Check if visited
                const { data: visit } = await supabase_1.supabase
                    .from("user_visits")
                    .select("id, visited_at, note")
                    .eq("poi_id", poiId)
                    .eq("user_id", userId)
                    .order("visited_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                // Check if bookmarked
                const { data: bookmark } = await supabase_1.supabase
                    .from("bookmarks")
                    .select("id, created_at")
                    .eq("poi_id", poiId)
                    .eq("user_id", userId)
                    .maybeSingle();
                return res.json({
                    success: true,
                    poi: {
                        ...poi,
                        visited: visit ? {
                            id: visit.id,
                            visited_at: visit.visited_at,
                            note: visit.note,
                        } : null,
                        bookmarked: bookmark ? {
                            id: bookmark.id,
                            created_at: bookmark.created_at,
                        } : null,
                    },
                });
            }
        }
        return res.json({
            success: true,
            poi,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * POST /map/pois/:id/visited
 * Mark POI as visited
 */
router.post("/pois/:id/visited", auth_1.requireAuth, async (req, res) => {
    try {
        const poiId = req.params.id;
        const userId = req.user.id;
        const { note, visited_at } = req.body;
        // Check POI exists
        const { data: poi, error: poiError } = await supabase_1.supabase
            .from("pois")
            .select("id")
            .eq("id", poiId)
            .eq("is_active", true)
            .single();
        if (poiError || !poi) {
            return res.status(404).json({ error: "POI not found" });
        }
        // Check if already visited
        const { data: existing, error: checkError } = await supabase_1.supabase
            .from("user_visits")
            .select("*")
            .eq("poi_id", poiId)
            .eq("user_id", userId)
            .maybeSingle();
        if (existing) {
            // Update existing visit
            const { data: visit, error: updateError } = await supabase_1.supabase
                .from("user_visits")
                .update({
                visited_at: visited_at || new Date().toISOString(),
                note: note || null,
            })
                .eq("id", existing.id)
                .select()
                .single();
            if (updateError) {
                console.error("Error updating visit:", updateError);
                return res.status(500).json({ error: "Failed to update visit" });
            }
            return res.json({
                success: true,
                message: "Visit updated",
                visit,
            });
        }
        // Create new visit
        const { data: visit, error: insertError } = await supabase_1.supabase
            .from("user_visits")
            .insert({
            user_id: userId,
            poi_id: poiId,
            visited_at: visited_at || new Date().toISOString(),
            note: note || null,
        })
            .select()
            .single();
        if (insertError) {
            console.error("Error creating visit:", insertError);
            return res.status(500).json({ error: "Failed to mark as visited" });
        }
        return res.status(201).json({
            success: true,
            message: "POI marked as visited",
            visit,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * DELETE /map/pois/:id/visited
 * Remove visit record
 */
router.delete("/pois/:id/visited", auth_1.requireAuth, async (req, res) => {
    try {
        const poiId = req.params.id;
        const userId = req.user.id;
        const { error } = await supabase_1.supabase
            .from("user_visits")
            .delete()
            .eq("poi_id", poiId)
            .eq("user_id", userId);
        if (error) {
            console.error("Error deleting visit:", error);
            return res.status(500).json({ error: "Failed to remove visit" });
        }
        return res.json({
            success: true,
            message: "Visit removed",
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * GET /map/pois/visited
 * Get user's visited POIs
 */
router.get("/pois/visited", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        const limitNum = Math.min(parseInt(limit) || 50, 100);
        const offsetNum = parseInt(offset) || 0;
        const { data: visits, error } = await supabase_1.supabase
            .from("user_visits")
            .select(`
        *,
        pois (*)
      `)
            .eq("user_id", userId)
            .order("visited_at", { ascending: false })
            .range(offsetNum, offsetNum + limitNum - 1);
        if (error) {
            console.error("Error fetching visits:", error);
            return res.status(500).json({ error: "Failed to fetch visits" });
        }
        return res.json({
            success: true,
            visits: visits || [],
            count: visits?.length || 0,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * POST /map/pois/:id/bookmark
 * Bookmark a POI
 */
router.post("/pois/:id/bookmark", auth_1.requireAuth, async (req, res) => {
    try {
        const poiId = req.params.id;
        const userId = req.user.id;
        // Check POI exists
        const { data: poi, error: poiError } = await supabase_1.supabase
            .from("pois")
            .select("id")
            .eq("id", poiId)
            .eq("is_active", true)
            .single();
        if (poiError || !poi) {
            return res.status(404).json({ error: "POI not found" });
        }
        // Check if already bookmarked
        const { data: existing, error: checkError } = await supabase_1.supabase
            .from("bookmarks")
            .select("*")
            .eq("poi_id", poiId)
            .eq("user_id", userId)
            .maybeSingle();
        if (existing) {
            return res.json({
                success: true,
                message: "Already bookmarked",
                bookmark: existing,
            });
        }
        // Create bookmark
        const { data: bookmark, error: insertError } = await supabase_1.supabase
            .from("bookmarks")
            .insert({
            user_id: userId,
            poi_id: poiId,
        })
            .select()
            .single();
        if (insertError) {
            console.error("Error creating bookmark:", insertError);
            return res.status(500).json({ error: "Failed to bookmark POI" });
        }
        return res.status(201).json({
            success: true,
            message: "POI bookmarked",
            bookmark,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * DELETE /map/pois/:id/bookmark
 * Remove bookmark
 */
router.delete("/pois/:id/bookmark", auth_1.requireAuth, async (req, res) => {
    try {
        const poiId = req.params.id;
        const userId = req.user.id;
        const { error } = await supabase_1.supabase
            .from("bookmarks")
            .delete()
            .eq("poi_id", poiId)
            .eq("user_id", userId);
        if (error) {
            console.error("Error deleting bookmark:", error);
            return res.status(500).json({ error: "Failed to remove bookmark" });
        }
        return res.json({
            success: true,
            message: "Bookmark removed",
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * GET /map/pois/bookmarked
 * Get user's bookmarked POIs
 */
router.get("/pois/bookmarked", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        const limitNum = Math.min(parseInt(limit) || 50, 100);
        const offsetNum = parseInt(offset) || 0;
        const { data: bookmarks, error } = await supabase_1.supabase
            .from("bookmarks")
            .select(`
        *,
        pois (*)
      `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offsetNum, offsetNum + limitNum - 1);
        if (error) {
            console.error("Error fetching bookmarks:", error);
            return res.status(500).json({ error: "Failed to fetch bookmarks" });
        }
        return res.json({
            success: true,
            bookmarks: bookmarks || [],
            count: bookmarks?.length || 0,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
