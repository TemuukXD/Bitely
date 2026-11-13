import Constants from 'expo-constants';

/**
 * Automatically resolves the backend URL from:
 * 1. User-configured override in app settings
 * 2. EXPO_PUBLIC_API_URL injected by start-dev.bat / start-dev.ps1
 * 3. Expo Go LAN hostUri IP address (e.g., 192.168.x.x:8081 -> http://192.168.x.x:3000)
 * 4. Default http://localhost:3000
 */
export function resolveDefaultApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:3000`;
    }
  }

  return 'http://localhost:3000';
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function formatMnt(amount: number): string {
  return `${Math.round(amount).toLocaleString()}₮`;
}

export function renderPriceSymbols(band: number): string {
  return '₮'.repeat(Math.max(1, Math.min(4, band)));
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
