// src/routes/admin.ts
import { Router } from "express";
import { requireAdmin, AuthRequest } from "../middleware/auth";
import { poiImportService } from "../services/poiImport";
import { googlePlacesService } from "../services/googlePlaces";

const router = Router();

/**
 * TEST: Check if Google Places API is working
 * GET /admin/test/google-api
 */
router.get("/test/google-api", requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Test with a simple search around Melbourne
    const testLocation = {
      lat: -37.8136,
      lng: 144.9631,
    };

    console.log("Testing Google Places API...");
    const results = await googlePlacesService.searchNearby({
      location: testLocation,
      radius: 5000, // 5km radius
      types: ["park"],
    });

    return res.json({
      success: true,
      message: `Google Places API is working! Found ${results.length} parks near Melbourne.`,
      sampleResults: results.slice(0, 3).map((p) => ({
        name: p.name,
        place_id: p.place_id,
        address: p.formatted_address,
      })),
    });
  } catch (error: any) {
    console.error("Google API test failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * TEST: Import small batch of POIs for testing
 * POST /admin/test/import-sample
 */
router.post("/test/import-sample", requireAdmin, async (req: AuthRequest, res) => {
  try {
    console.log("Starting sample POI import...");

    // Small test import: Parks near Melbourne
    const result = await poiImportService.importRegion({
      region: "VIC-TEST",
      types: ["park"], // Just one type for testing
      centerLat: -37.8136,
      centerLng: 144.9631,
      radius: 10000, // 10km radius - small test area
    });

    return res.json({
      success: true,
      message: "Sample import completed!",
      stats: result,
    });
  } catch (error: any) {
    console.error("Sample import failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * FULL IMPORT: Import POIs for a region
 * POST /admin/import/region
 * Body: { region: "VIC", types: ["campground", "park"], centerLat: -37.8, centerLng: 144.9, radius: 50000 }
 */
router.post("/import/region", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { region, types, centerLat, centerLng, radius } = req.body;

    // Validation
    if (!region || !types || !centerLat || !centerLng) {
      return res.status(400).json({
        error: "Missing required fields: region, types, centerLat, centerLng",
      });
    }

    if (!Array.isArray(types) || types.length === 0) {
      return res.status(400).json({
        error: "types must be a non-empty array",
      });
    }

    console.log(`Starting POI import for ${region}...`);

    const result = await poiImportService.importRegion({
      region,
      types,
      centerLat,
      centerLng,
      radius: radius || 50000,
    });

    return res.json({
      success: true,
      message: `Import completed for ${region}`,
      stats: result,
    });
  } catch (error: any) {
    console.error("Region import failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get import statistics
 * GET /admin/pois/stats
 */
router.get("/pois/stats", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { supabase } = await import("../supabase");

    // Count POIs by region
    const { data: byRegion, error: regionError } = await supabase
      .from("pois")
      .select("region_code")
      .then((result) => {
        if (result.error) throw result.error;
        
        const counts: Record<string, number> = {};
        result.data?.forEach((poi: any) => {
          counts[poi.region_code] = (counts[poi.region_code] || 0) + 1;
        });
        
        return { data: counts, error: null };
      });

    // Count POIs by type
    const { data: byType, error: typeError } = await supabase
      .from("pois")
      .select("place_type")
      .then((result) => {
        if (result.error) throw result.error;
        
        const counts: Record<string, number> = {};
        result.data?.forEach((poi: any) => {
          counts[poi.place_type] = (counts[poi.place_type] || 0) + 1;
        });
        
        return { data: counts, error: null };
      });

    // Total count
    const { count, error: countError } = await supabase
      .from("pois")
      .select("*", { count: "exact", head: true });

    if (regionError || typeError || countError) {
      throw regionError || typeError || countError;
    }

    return res.json({
      success: true,
      stats: {
        total: count || 0,
        byRegion,
        byType,
      },
    });
  } catch (error: any) {
    console.error("Failed to get POI stats:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

