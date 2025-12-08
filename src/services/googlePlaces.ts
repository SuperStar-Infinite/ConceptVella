// src/services/googlePlaces.ts
import axios from "axios";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = "https://maps.googleapis.com/maps/api/place";

interface PlaceSearchParams {
  location: { lat: number; lng: number };
  radius?: number;
  types?: string[];
  keyword?: string;
}

interface GooglePlace {
  place_id: string;
  name: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  formatted_address?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
}

export class GooglePlacesService {
  /**
   * Search for places near a location
   */
  async searchNearby(params: PlaceSearchParams): Promise<GooglePlace[]> {
    const { location, radius = 50000, types = [], keyword } = params;

    try {
      const response = await axios.get(`${PLACES_API_URL}/nearbysearch/json`, {
        params: {
          location: `${location.lat},${location.lng}`,
          radius,
          type: types.join("|"),
          keyword,
          key: GOOGLE_API_KEY,
        },
      });

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.results || [];
    } catch (error) {
      console.error("Error searching Google Places:", error);
      throw error;
    }
  }

  /**
   * Get detailed information about a place
   */
  async getPlaceDetails(placeId: string): Promise<any> {
    try {
      const response = await axios.get(`${PLACES_API_URL}/details/json`, {
        params: {
          place_id: placeId,
          fields: "name,formatted_address,geometry,types,rating,user_ratings_total,photos,opening_hours",
          key: GOOGLE_API_KEY,
        },
      });

      if (response.data.status !== "OK") {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.result;
    } catch (error) {
      console.error("Error fetching place details:", error);
      throw error;
    }
  }

  /**
   * Text search for places (e.g., "campgrounds in Victoria, Australia")
   */
  async textSearch(query: string): Promise<GooglePlace[]> {
    try {
      const response = await axios.get(`${PLACES_API_URL}/textsearch/json`, {
        params: {
          query,
          key: GOOGLE_API_KEY,
        },
      });

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.results || [];
    } catch (error) {
      console.error("Error searching Google Places:", error);
      throw error;
    }
  }
}

export const googlePlacesService = new GooglePlacesService();