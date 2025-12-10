"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/journey.ts
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /journey/visited
 * Get user's visited POIs for Journey view (with POI details)
 *
 * This is the main endpoint for the Journey page
 */
router.get("/visited", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 100, offset = 0 } = req.query;
        const limitNum = Math.min(parseInt(limit) || 100, 200);
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
            console.error("Error fetching visited POIs:", error);
            return res.status(500).json({ error: "Failed to fetch visited POIs" });
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
 * GET /journey/stats
 * Get journey statistics for user
 *
 * Returns: total visited, regions visited, types visited, etc.
 */
router.get("/stats", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Total visits count
        const { count: totalVisits, error: visitsError } = await supabase_1.supabase
            .from("user_visits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);
        if (visitsError) {
            console.error("Error counting visits:", visitsError);
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
        // Get unique POIs visited
        const { data: uniquePOIs, error: uniqueError } = await supabase_1.supabase
            .from("user_visits")
            .select("poi_id")
            .eq("user_id", userId);
        if (uniqueError) {
            console.error("Error fetching unique POIs:", uniqueError);
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
        const uniquePOICount = new Set(uniquePOIs?.map((v) => v.poi_id) || []).size;
        // Get regions visited (from POIs)
        const { data: visitsWithPOIs, error: regionsError } = await supabase_1.supabase
            .from("user_visits")
            .select(`
        pois!inner(region_code)
      `)
            .eq("user_id", userId);
        if (regionsError) {
            console.error("Error fetching regions:", regionsError);
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
        const regionsVisited = new Set(visitsWithPOIs?.map((v) => v.pois?.region_code).filter(Boolean) || []);
        // Get types visited
        const { data: visitsWithTypes, error: typesError } = await supabase_1.supabase
            .from("user_visits")
            .select(`
        pois!inner(place_type)
      `)
            .eq("user_id", userId);
        if (typesError) {
            console.error("Error fetching types:", typesError);
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
        const typesVisited = new Set(visitsWithTypes?.map((v) => v.pois?.place_type).filter(Boolean) || []);
        // Get first and last visit dates
        const { data: firstVisit, error: firstError } = await supabase_1.supabase
            .from("user_visits")
            .select("visited_at")
            .eq("user_id", userId)
            .order("visited_at", { ascending: true })
            .limit(1)
            .maybeSingle();
        const { data: lastVisit, error: lastError } = await supabase_1.supabase
            .from("user_visits")
            .select("visited_at")
            .eq("user_id", userId)
            .order("visited_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        return res.json({
            success: true,
            stats: {
                total_visits: totalVisits || 0,
                unique_pois_visited: uniquePOICount,
                regions_visited: Array.from(regionsVisited),
                regions_count: regionsVisited.size,
                types_visited: Array.from(typesVisited),
                types_count: typesVisited.size,
                first_visit: firstVisit?.visited_at || null,
                last_visit: lastVisit?.visited_at || null,
            },
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * GET /journey/timeline
 * Get journey timeline (visits grouped by date)
 *
 * Returns visits organized by date for timeline view
 */
router.get("/timeline", auth_1.requireAuth, async (req, res) => {
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
            console.error("Error fetching timeline:", error);
            return res.status(500).json({ error: "Failed to fetch timeline" });
        }
        // Group visits by date
        const timeline = {};
        visits?.forEach((visit) => {
            const date = new Date(visit.visited_at).toISOString().split("T")[0]; // YYYY-MM-DD
            if (!timeline[date]) {
                timeline[date] = [];
            }
            timeline[date].push(visit);
        });
        // Convert to array format
        const timelineArray = Object.entries(timeline)
            .map(([date, visits]) => ({
            date,
            visits,
            count: visits.length,
        }))
            .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
        return res.json({
            success: true,
            timeline: timelineArray,
            count: timelineArray.length,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * GET /journey/regions
 * Get journey breakdown by region
 *
 * Returns visits grouped by region with counts
 */
router.get("/regions", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: visits, error } = await supabase_1.supabase
            .from("user_visits")
            .select(`
        pois!inner(region_code)
      `)
            .eq("user_id", userId);
        if (error) {
            console.error("Error fetching regions:", error);
            return res.status(500).json({ error: "Failed to fetch regions" });
        }
        // Group by region
        const regionCounts = {};
        visits?.forEach((visit) => {
            const region = visit.pois?.region_code;
            if (region) {
                regionCounts[region] = (regionCounts[region] || 0) + 1;
            }
        });
        const regions = Object.entries(regionCounts)
            .map(([region_code, count]) => ({
            region_code,
            count,
        }))
            .sort((a, b) => b.count - a.count); // Most visited first
        return res.json({
            success: true,
            regions,
            total_regions: regions.length,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
