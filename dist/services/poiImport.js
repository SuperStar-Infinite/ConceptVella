"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poiImportService = exports.POIImportService = void 0;
// src/services/poiImport.ts
const supabase_1 = require("../supabase");
const googlePlaces_1 = require("./googlePlaces");
class POIImportService {
    /**
     * Import POIs from Google for a specific region
     */
    async importRegion(params) {
        const { region, types, centerLat, centerLng, radius = 50000 } = params;
        console.log(`Starting POI import for ${region}...`);
        const allPlaces = [];
        // Search for each type
        for (const type of types) {
            console.log(`Searching for ${type} in ${region}...`);
            try {
                const places = await googlePlaces_1.googlePlacesService.searchNearby({
                    location: { lat: centerLat, lng: centerLng },
                    radius,
                    types: [type],
                });
                console.log(`Found ${places.length} places for type: ${type}`);
                allPlaces.push(...places);
            }
            catch (error) {
                console.error(`Error searching for ${type}:`, error);
            }
            // Rate limiting: wait 200ms between requests
            await this.sleep(200);
        }
        // Remove duplicates by place_id
        const uniquePlaces = this.deduplicatePlaces(allPlaces);
        console.log(`Total unique places found: ${uniquePlaces.length}`);
        // Insert into database
        const inserted = await this.insertPOIs(uniquePlaces, region);
        return {
            region,
            searched: allPlaces.length,
            unique: uniquePlaces.length,
            inserted,
        };
    }
    /**
     * Insert POIs into database
     */
    async insertPOIs(places, regionCode) {
        const poisToInsert = places.map((place) => ({
            google_place_id: place.place_id,
            source: "google",
            name: place.name,
            address: place.formatted_address || place.vicinity,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            region_code: regionCode,
            place_type: place.types?.[0] || "unknown",
            google_rating: place.rating || null,
            google_user_ratings_total: place.user_ratings_total || null,
            last_google_sync: new Date().toISOString(),
            google_attribution: "Powered by Google",
            is_active: true,
        }));
        // Insert in batches of 100 (Supabase limit)
        let totalInserted = 0;
        const batchSize = 100;
        for (let i = 0; i < poisToInsert.length; i += batchSize) {
            const batch = poisToInsert.slice(i, i + batchSize);
            // Use upsert to avoid duplicates
            const { data, error } = await supabase_1.supabase
                .from("pois")
                .upsert(batch, {
                onConflict: "google_place_id",
                ignoreDuplicates: true
            });
            if (error) {
                console.error("Error inserting POI batch:", error);
            }
            else {
                totalInserted += batch.length;
                console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} POIs`);
            }
            // Rate limiting between batches
            await this.sleep(100);
        }
        return totalInserted;
    }
    /**
     * Remove duplicate places by place_id
     */
    deduplicatePlaces(places) {
        const seen = new Set();
        return places.filter((place) => {
            if (seen.has(place.place_id)) {
                return false;
            }
            seen.add(place.place_id);
            return true;
        });
    }
    /**
     * Sleep helper for rate limiting
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.POIImportService = POIImportService;
exports.poiImportService = new POIImportService();
