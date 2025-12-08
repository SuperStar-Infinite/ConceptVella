// src/services/poiImport.ts
import { supabase } from "../supabase";
import { googlePlacesService } from "./googlePlaces";

interface ImportRegionParams {
  region: string;
  types: string[];
  centerLat: number;
  centerLng: number;
  radius?: number;
}

export class POIImportService {
  /**
   * Import POIs from Google for a specific region
   */
  async importRegion(params: ImportRegionParams) {
    const { region, types, centerLat, centerLng, radius = 50000 } = params;

    console.log(`Starting POI import for ${region}...`);

    const allPlaces: any[] = [];

    // Search for each type
    for (const type of types) {
      console.log(`Searching for ${type} in ${region}...`);

      try {
        const places = await googlePlacesService.searchNearby({
          location: { lat: centerLat, lng: centerLng },
          radius,
          types: [type],
        });

        console.log(`Found ${places.length} places for type: ${type}`);
        allPlaces.push(...places);
      } catch (error) {
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
  private async insertPOIs(places: any[], regionCode: string) {
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
      const { data, error } = await supabase
        .from("pois")
        .upsert(batch, { 
          onConflict: "google_place_id",
          ignoreDuplicates: true 
        });

      if (error) {
        console.error("Error inserting POI batch:", error);
      } else {
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
  private deduplicatePlaces(places: any[]) {
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
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const poiImportService = new POIImportService();