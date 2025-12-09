"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const poiImport_1 = require("../services/poiImport");
const googlePlaces_1 = require("../services/googlePlaces");
const router = (0, express_1.Router)();
/**
 * TEST: Check if Google Places API is working
 * GET /admin/test/google-api
 */
router.get("/test/google-api", auth_1.requireAdmin, async (req, res) => {
    try {
        // Test with a simple search around Melbourne
        const testLocation = {
            lat: -37.8136,
            lng: 144.9631,
        };
        console.log("Testing Google Places API...");
        const results = await googlePlaces_1.googlePlacesService.searchNearby({
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
    }
    catch (error) {
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
router.post("/test/import-sample", auth_1.requireAdmin, async (req, res) => {
    try {
        console.log("Starting sample POI import...");
        // Small test import: Parks near Melbourne
        const result = await poiImport_1.poiImportService.importRegion({
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
    }
    catch (error) {
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
router.post("/import/region", auth_1.requireAdmin, async (req, res) => {
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
        const result = await poiImport_1.poiImportService.importRegion({
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
    }
    catch (error) {
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
router.get("/pois/stats", auth_1.requireAdmin, async (req, res) => {
    try {
        const { supabase } = await Promise.resolve().then(() => __importStar(require("../supabase")));
        // Count POIs by region
        const { data: byRegion, error: regionError } = await supabase
            .from("pois")
            .select("region_code")
            .then((result) => {
            if (result.error)
                throw result.error;
            const counts = {};
            result.data?.forEach((poi) => {
                counts[poi.region_code] = (counts[poi.region_code] || 0) + 1;
            });
            return { data: counts, error: null };
        });
        // Count POIs by type
        const { data: byType, error: typeError } = await supabase
            .from("pois")
            .select("place_type")
            .then((result) => {
            if (result.error)
                throw result.error;
            const counts = {};
            result.data?.forEach((poi) => {
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
    }
    catch (error) {
        console.error("Failed to get POI stats:", error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
