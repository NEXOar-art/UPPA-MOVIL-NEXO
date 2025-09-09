import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { Bus, BusStop, Coordinates, Report, RouteResult, MicromobilityService, MicromobilityServiceType } from '../types';
import { MICROMOBILITY_SERVICE_ICONS } from '../constants';

// Declare the heatLayer on the L namespace to satisfy TypeScript
declare module 'leaflet' {
  function heatLayer(latlngs: L.LatLngExpression[], options?: any): any;
}

// Custom Icon definitions
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-icon',
    html: `<div class="pulse-ring"></div><div class="dot"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createBusIcon = (bus: Bus, isSelected: boolean) => {
    const colorClass = bus.color.replace('bg-', 'bg-');
    return L.divIcon({
        className: `bus-marker-icon ${isSelected ? 'selected' : ''} ${colorClass}`,
        html: `<i class="fas fa-bus-alt"></i>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

const createMicromobilityIcon = (service: MicromobilityService) => {
    const iconClass = MICROMOBILITY_SERVICE_ICONS[service.type];
    const colorClass = service.type === MicromobilityServiceType.Moto ? 'text-sky-300' : 'text-indigo-300';
    return L.divIcon({
        className: 'micromobility-marker-icon',
        html: `<i class="fas ${iconClass} ${colorClass}"></i>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

interface MapDisplayProps {
  center: Coordinates;
  zoom: number;
  buses: Record<string, Bus>;
  busStops: Record<string, BusStop[]>;
  reports: Report[];
  micromobilityServices: MicromobilityService[];
  selectedBusLineId: string | null;
  userLocation: Coordinates | null;
  routeResult: RouteResult | null;
  isNavigating: boolean;
  onSelectBusStop: (stop: BusStop) => void;
  onNavigateToStopLocation: (coords: Coordinates) => void;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  center,
  zoom,
  buses,
  busStops,
  reports,
  micromobilityServices,
  selectedBusLineId,
  userLocation,
  routeResult,
  onNavigateToStopLocation
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const busLayerRef = useRef(L.layerGroup());
  const stopLayerRef = useRef(L.layerGroup());
  const userLocationLayerRef = useRef(L.layerGroup());
  const routeLayerRef = useRef(L.layerGroup());
  const micromobilityLayerRef = useRef(L.layerGroup());

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      busLayerRef.current.addTo(map);
      stopLayerRef.current.addTo(map);
      userLocationLayerRef.current.addTo(map);
      routeLayerRef.current.addTo(map);
      micromobilityLayerRef.current.addTo(map);

      mapRef.current = map;
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map view
  useEffect(() => {
    mapRef.current?.flyTo([center.lat, center.lng], 15);
  }, [center]);

  // Update user location marker
  useEffect(() => {
    userLocationLayerRef.current.clearLayers();
    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], { icon: createUserLocationIcon() })
        .addTo(userLocationLayerRef.current);
    }
  }, [userLocation]);

  // Update bus markers
  useEffect(() => {
    busLayerRef.current.clearLayers();
    Object.values(buses).forEach(bus => {
      const isSelected = bus.id === selectedBusLineId;
      const marker = L.marker([bus.currentLocation.lat, bus.currentLocation.lng], {
        icon: createBusIcon(bus, isSelected)
      }).addTo(busLayerRef.current);

      marker.bindPopup(`
        <div class="p-1">
          <h4 class="font-bold text-cyan-300 font-orbitron pr-4">${bus.lineName}</h4>
          <div class="mt-1.5 text-xs space-y-1">
            <p class="flex items-center text-slate-200">
              <i class="fas fa-traffic-light text-green-400 w-4 text-center mr-1.5"></i>
              Estado: <span class="font-semibold ml-1">En Movimiento</span>
            </p>
            <p class="flex items-center text-slate-300">
              <i class="fas fa-clock w-4 text-center mr-1.5"></i>
              Actualizado: <span class="font-semibold ml-1">Ahora</span>
            </p>
          </div>
        </div>
      `);
    });
  }, [buses, selectedBusLineId]);
  
   // Update micromobility markers
  useEffect(() => {
    micromobilityLayerRef.current.clearLayers();
    micromobilityServices
      .filter(s => s.isActive && s.isAvailable && !s.isOccupied)
      .forEach(service => {
        L.marker([service.location.lat, service.location.lng], { 
          icon: createMicromobilityIcon(service) 
        })
        .addTo(micromobilityLayerRef.current)
        .bindPopup(`
            <div class="p-1">
                <h4 class="font-bold text-white font-orbitron">${service.serviceName}</h4>
                <p class="text-xs text-slate-300">${service.providerName} (${service.type})</p>
                <p class="text-xs text-slate-400 mt-1">${service.vehicleModel}</p>
            </div>
        `);
      });
  }, [micromobilityServices]);

  // Update bus stops
  useEffect(() => {
    stopLayerRef.current.clearLayers();
    const stops = selectedBusLineId ? busStops[selectedBusLineId] || [] : [];
    stops.forEach(stop => {
      const stopMarker = L.circleMarker([stop.location.lat, stop.location.lng], {
        radius: 5,
        fillColor: 'var(--ps-cyan)',
        color: '#FFF',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(stopLayerRef.current);
      
      stopMarker.on('click', () => onNavigateToStopLocation(stop.location));

      stopMarker.bindPopup(`
         <div class="p-1">
            <h4 class="font-bold text-white font-orbitron text-sm">${stop.name}</h4>
            <p class="text-xs text-slate-300 mt-1">Click en el ícono para trazar ruta aquí.</p>
         </div>
      `);
    });
  }, [selectedBusLineId, busStops, onNavigateToStopLocation]);

  // Update route
  useEffect(() => {
    routeLayerRef.current.clearLayers();
    if (routeResult?.geometry) {
      const routeLine = L.geoJSON(routeResult.geometry, {
        style: () => ({
          color: 'var(--ps-cyan)',
          weight: 5,
          opacity: 0.8,
        })
      }).addTo(routeLayerRef.current);
      
      // Add a glow effect using a thicker, less opaque line underneath
      L.geoJSON(routeResult.geometry, {
        style: () => ({
          color: 'var(--ps-cyan)',
          weight: 12,
          opacity: 0.3,
        })
      }).addTo(routeLayerRef.current);

      mapRef.current?.fitBounds(routeLine.getBounds().pad(0.1));
    }
  }, [routeResult]);

  return (
      <div className="w-full h-full rounded-lg overflow-hidden border-2 border-blue-500/30 relative">
          <div ref={mapContainerRef} className="w-full h-full" />
      </div>
  );
};

export default MapDisplay;