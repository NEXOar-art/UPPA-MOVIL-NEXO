import { Coordinates } from '../types';

/**
 * Uses the Web Speech API to speak a given text string.
 * It will cancel any previously ongoing speech.
 * @param text The string to be spoken.
 * @param lang The language code (e.g., 'es-AR').
 */
export const speak = (text: string, lang: string = 'es-AR'): void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn("Speech Synthesis not supported in this browser.");
    return;
  }

  // Cancel any previous speech to avoid overlap
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.1; // Slightly faster than normal
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
};

/**
 * Calculates the distance between two geographical coordinates using the Haversine formula.
 * @param coords1 The first coordinate object { lat, lng }.
 * @param coords2 The second coordinate object { lat, lng }.
 * @returns The distance in meters.
 */
export const calculateDistance = (coords1: Coordinates, coords2: Coordinates): number => {
  if(!coords1 || !coords2) return Infinity;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters

  const lat1 = coords1.lat;
  const lon1 = coords1.lng;
  const lat2 = coords2.lat;
  const lon2 = coords2.lng;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};
