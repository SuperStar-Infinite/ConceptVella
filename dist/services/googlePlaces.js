"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googlePlacesService = exports.GooglePlacesService = void 0;
// src/services/googlePlaces.ts
const axios_1 = __importDefault(require("axios"));
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = "https://maps.googleapis.com/maps/api/place";
class GooglePlacesService {
    /**
     * Search for places near a location
     */
    async searchNearby(params) {
        const { location, radius = 50000, types = [], keyword } = params;
        try {
            const response = await axios_1.default.get(`${PLACES_API_URL}/nearbysearch/json`, {
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
        }
        catch (error) {
            console.error("Error searching Google Places:", error);
            throw error;
        }
    }
    /**
     * Get detailed information about a place
     */
    async getPlaceDetails(placeId) {
        try {
            const response = await axios_1.default.get(`${PLACES_API_URL}/details/json`, {
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
        }
        catch (error) {
            console.error("Error fetching place details:", error);
            throw error;
        }
    }
    /**
     * Text search for places (e.g., "campgrounds in Victoria, Australia")
     */
    async textSearch(query) {
        try {
            const response = await axios_1.default.get(`${PLACES_API_URL}/textsearch/json`, {
                params: {
                    query,
                    key: GOOGLE_API_KEY,
                },
            });
            if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
                throw new Error(`Google Places API error: ${response.data.status}`);
            }
            return response.data.results || [];
        }
        catch (error) {
            console.error("Error searching Google Places:", error);
            throw error;
        }
    }
}
exports.GooglePlacesService = GooglePlacesService;
exports.googlePlacesService = new GooglePlacesService();
