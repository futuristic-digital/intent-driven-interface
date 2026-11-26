import 'mapbox-gl/dist/mapbox-gl.css';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { createRoot } from 'react-dom/client';
import { type Map as MapboxMap, LngLatBounds, Popup } from 'mapbox-gl';
import { mapBox } from '../utils/mapbox';

export type Marker = {
  label: string;
  position: [number, number];
  bgColor: string;
  borderColor: string;
  popup?: ReactElement;
};

const MAP_STARTUP_TIMEOUT_MS = 10_000;

export const Map = ({
  initial,
  markers,
  loading,
  onUnavailable,
}: {
  initial: {
    position: [number, number];
    zoom: number;
  };
  markers: Marker[];
  loading?: string;
  onUnavailable: () => void;
}) => {
  const mapRef = useRef<MapboxMap>(null);
  const [loadedMap, setLoadedMap] = useState<MapboxMap | null>(null);

  const mapContainerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) return;

      if (!mapBox.accessToken?.trim()) {
        onUnavailable();
        return;
      }

      let map: MapboxMap;
      try {
        map = new mapBox.Map({
          container,
          center: initial.position,
          zoom: initial.zoom,
        });
      } catch {
        onUnavailable();
        return;
      }

      mapRef.current = map;
      const startupTimeout = window.setTimeout(
        handleStartupFailure,
        MAP_STARTUP_TIMEOUT_MS
      );
      function stopWatchingStartup() {
        window.clearTimeout(startupTimeout);
        map.off('error', handleStartupFailure);
        map.off('load', handleLoad);
      }
      function handleStartupFailure() {
        stopWatchingStartup();
        onUnavailable();
      }
      function handleLoad() {
        stopWatchingStartup();
        setLoadedMap(map);
      }
      map.on('error', handleStartupFailure);
      map.on('load', handleLoad);
      // Toggling pinned components changes the map's width without a window resize.
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(container);

      return () => {
        stopWatchingStartup();
        resizeObserver.disconnect();
        mapRef.current = null;
        map.remove();
      };
    },
    [initial, onUnavailable]
  );

  useEffect(() => {
    if (!loadedMap || loadedMap !== mapRef.current) return;

    const bounds = new LngLatBounds();
    const removeMarkers = markers.map((marker) => {
      const [lat, lng] = marker.position;
      bounds.extend([lng, lat]);
      return addMarker(loadedMap, marker);
    });

    if (markers.length > 0) {
      loadedMap.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12,
      });
    }

    return () => removeMarkers.forEach((remove) => remove());
  }, [loadedMap, markers]);

  return (
    <div className="relative h-96">
      {(loading || !loadedMap) && (
        <div
          role="status"
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-muted/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3">
            <div
              aria-hidden="true"
              className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent motion-safe:animate-spin"
            />
            <span className="text-sm font-medium text-muted-foreground">
              {loading || 'Loading map…'}
            </span>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} inert={!loadedMap} className="h-full w-full" />
    </div>
  );
};

function addMarker(
  map: MapboxMap,
  { label, position, bgColor, borderColor, popup }: Marker
) {
  const [lat, lng] = position;
  const markerElement = document.createElement('div');
  markerElement.setAttribute('aria-label', label);
  markerElement.className =
    'group flex size-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
  const dot = document.createElement('span');
  dot.setAttribute('aria-hidden', 'true');
  dot.className = `relative size-4 rounded-full border-2 ${borderColor} ${bgColor}`;
  if (popup) {
    markerElement.classList.add('cursor-pointer');
    dot.classList.add(
      'motion-safe:transition-transform',
      'motion-safe:group-hover:scale-125'
    );
  }
  const pulse = document.createElement('span');
  pulse.className = `absolute -inset-2 rounded-full motion-safe:animate-ping ${bgColor}`;
  dot.append(pulse);
  markerElement.append(dot);

  const marker = new mapBox.Marker({
    element: markerElement,
    anchor: 'center',
  }).setLngLat([lng, lat]);
  const popupContainer = popup ? document.createElement('div') : null;
  const popupRoot = popupContainer ? createRoot(popupContainer) : null;
  if (popupContainer && popupRoot) {
    const mapPopup = new Popup({
      closeOnClick: true,
      closeButton: false,
      className:
        '[&_.mapboxgl-popup-content]:bg-popover [&_.mapboxgl-popup-content]:text-popover-foreground',
    }).setDOMContent(popupContainer);
    function closePopup() {
      mapPopup.remove();
      markerElement.focus();
    }
    mapPopup.on('close', () =>
      markerElement.setAttribute('aria-expanded', 'false')
    );
    popupRoot.render(
      <div
        className="relative"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closePopup();
          }
        }}
      >
        {popup}
        <button
          type="button"
          className="absolute top-0 right-0 flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Close"
          onClick={closePopup}
        >
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </button>
      </div>
    );
    // Mapbox supplies keyboard activation and a single tab stop for this marker.
    marker.setPopup(mapPopup);
  }
  marker.addTo(map);

  return () => {
    marker.remove();
    // Separate React roots cannot unmount synchronously during the parent commit.
    if (popupRoot) queueMicrotask(() => popupRoot.unmount());
  };
}
