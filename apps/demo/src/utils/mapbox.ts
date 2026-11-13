import mapboxgl from 'mapbox-gl';

// access token from https://account.mapbox.com
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

export { mapboxgl as mapBox };
