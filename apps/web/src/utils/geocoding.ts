/**
 * Mapbox Geocoding Utilities
 *
 * Provides reverse geocoding functionality to convert coordinates to human-readable place names.
 */

import { MAPBOX_TOKEN } from '../config/mapbox';

/**
 * Mapbox reverse geocoding response feature
 */
interface MapboxReverseGeocodingFeature {
  id: string;
  type: 'Feature';
  place_type: string[];
  place_name: string;
  text: string;
  center: [number, number];
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

/**
 * Mapbox reverse geocoding response
 */
interface MapboxReverseGeocodingResponse {
  type: 'FeatureCollection';
  query: [number, number];
  features: MapboxReverseGeocodingFeature[];
  attribution: string;
}

/**
 * Formats a locality description from Mapbox reverse geocoding result.
 *
 * Extracts the most relevant place name and state/region for fire location context.
 *
 * Examples:
 * - "near Bungendore, New South Wales"
 * - "south of Bendigo, Victoria"
 * - "in the Blue Mountains, New South Wales"
 *
 * @param feature - Mapbox feature from reverse geocoding response
 * @returns Formatted locality description, or undefined if not available
 */
function formatLocalityDescription(feature: MapboxReverseGeocodingFeature): string | undefined {
  if (!feature) return undefined;

  const placeName = feature.text || feature.place_name;
  const placeTypes = feature.place_type || [];

  // Extract state/region from context
  let state: string | undefined;
  if (feature.context) {
    // Look for region (state) in context
    const regionContext = feature.context.find((ctx) => ctx.id.startsWith('region.'));
    state = regionContext?.text;
  }

  // Format based on place type
  if (placeTypes.includes('locality') || placeTypes.includes('place')) {
    // Town or city - use "near [town], [state]"
    return state ? `near ${placeName}, ${state}` : `near ${placeName}`;
  } else if (placeTypes.includes('region')) {
    // Region/state level - use "in [state]"
    return `in ${placeName}`;
  } else if (placeTypes.includes('district') || placeTypes.includes('neighborhood')) {
    // District or area - use "in the [area], [state]"
    return state ? `in the ${placeName} area, ${state}` : `in the ${placeName} area`;
  } else {
    // Generic fallback
    return state ? `near ${placeName}, ${state}` : `near ${placeName}`;
  }
}

/**
 * Performs reverse geocoding to get a locality description for coordinates.
 *
 * Uses Mapbox Geocoding API to convert longitude/latitude to a human-readable place name.
 *
 * @param longitude - Longitude coordinate
 * @param latitude - Latitude coordinate
 * @returns Formatted locality description (e.g., "near Bungendore, New South Wales"), or undefined if failed
 */
export async function reverseGeocode(
  longitude: number,
  latitude: number
): Promise<string | undefined> {
  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not configured, skipping reverse geocoding');
    return undefined;
  }

  try {
    // Mapbox reverse geocoding endpoint
    // https://docs.mapbox.com/api/search/geocoding/#reverse-geocoding
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,district,region&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Reverse geocoding failed: ${response.status} ${response.statusText}`);
      return undefined;
    }

    const data: MapboxReverseGeocodingResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('No reverse geocoding results found');
      return undefined;
    }

    // Use the first (most relevant) feature
    const feature = data.features[0];
    const locality = formatLocalityDescription(feature);

    console.log(`Reverse geocoded [${longitude}, ${latitude}] to: ${locality}`);
    return locality;
  } catch (error) {
    console.warn('Reverse geocoding error:', error);
    return undefined;
  }
}

/**
 * Gets locality description for a fire perimeter centroid.
 *
 * @param centroid - Fire perimeter centroid coordinates [lng, lat]
 * @returns Formatted locality description, or undefined if failed
 */
export async function getPerimeterLocality(
  centroid: [number, number]
): Promise<string | undefined> {
  const [longitude, latitude] = centroid;
  return reverseGeocode(longitude, latitude);
}
