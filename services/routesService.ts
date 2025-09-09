

import { LOCATIONIQ_API_KEY } from '../constants';
import { Coordinates, TravelMode, RouteResult, Maneuver } from '../types';
import { fetchWithRetry } from './geolocationService';

interface LocationIQManeuver {
  bearing_after: number;
  bearing_before: number;
  instruction: string;
  location: [number, number]; // [lng, lat]
  modifier?: string;
  type: string;
}

interface LocationIQStep {
  distance: number;
  duration: number;
  geometry: any;
  maneuver: LocationIQManeuver;
  name: string;
}

interface LocationIQRoute {
  distance: number;
  duration: number;
  geometry: any; // GeoJSON object
  legs: {
    steps: LocationIQStep[];
  }[];
}

interface LocationIQDirectionsResponse {
  code: string;
  routes?: LocationIQRoute[];
  message?: string;
  error?: string; // LocationIQ sometimes returns error in this field
}

// Mapping our TravelMode to LocationIQ's profile strings
const travelModeMap: Record<TravelMode, 'driving' | 'cycling' | 'walking'> = {
    DRIVE: 'driving',
    BICYCLE: 'cycling',
    WALK: 'walking',
};

export const fetchRoute = async (origin: Coordinates, destination: Coordinates, travelMode: TravelMode): Promise<RouteResult> => {
  if (!LOCATIONIQ_API_KEY) {
    return { error: 'La clave API de LocationIQ no está configurada.' };
  }
  const profile = travelModeMap[travelMode];
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  // FIX: Corrected the hostname. The Directions API lives on the `us1` subdomain, not `api`.
  // Added steps=true to get turn-by-turn instructions.
  const url = `https://us1.locationiq.com/v1/directions/${profile}/${coordinates}?key=${LOCATIONIQ_API_KEY}&geometries=geojson&overview=full&steps=true`;

  try {
    const response = await fetchWithRetry(url);

    // FIX: Added robust error handling for non-JSON responses, which was causing a crash.
    // The response body is now read as text first if the status code is not OK.
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorText;
        } catch (e) {
            // Not JSON, use raw text.
        }
        console.error(`Error de la API de rutas (${response.status}):`, errorMessage);
        return { error: `No se pudo calcular la ruta: ${errorMessage}` };
    }
      
    const data: LocationIQDirectionsResponse = await response.json();

    if (data.code !== 'Ok') {
      console.error("LocationIQ Directions API error:", data.message);
      return { error: data.message || 'Error desconocido al calcular la ruta.' };
    }
    
    if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const minutes = Math.floor(route.duration / 60);
        const durationText = `${minutes} min`;
        const distanceText = `${(route.distance / 1000).toFixed(1)} km`;
        
        const steps: Maneuver[] = route.legs[0].steps.map(step => ({
            instruction: step.maneuver.instruction,
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            distance: step.distance,
            location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] },
        }));

        return {
            duration: durationText,
            distance: distanceText,
            geometry: route.geometry,
            steps: steps,
        };
    } else {
        return { error: 'No se encontró una ruta entre los puntos seleccionados.' };
    }

  } catch (error: any) {
    console.error("Error al buscar la ruta:", error);
    // The specific error message from fetchWithRetry will be passed here.
    return { error: `Fallo la conexión con el servicio de rutas. ${error.message}` };
  }
};