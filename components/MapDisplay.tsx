
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Bus, BusStop, Coordinates, Report, RouteResult, MicromobilityService, MicromobilityServiceType } from '../types';
import { MICROMOBILITY_SERVICE_ICONS } from '../constants';

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
  serviceToConfirm: string | null;
  onInitiateRequest: (serviceId: string) => void;
  onSelectBusStop: (stop: BusStop) => void;
  onNavigateToStopLocation: (coords: Coordinates) => void;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  center,
  zoom,
  buses,
  busStops,
  micromobilityServices,
  selectedBusLineId,
  userLocation,
  routeResult,
  serviceToConfirm,
  onInitiateRequest,
  onNavigateToStopLocation
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const busLayerRef = useRef(L.layerGroup());
  
  // FIX: Implementación de Marker Clustering para paradas
  const stopClusterRef = useRef<any>(null);
  
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

      // Initialize Cluster Group for stops
      if ((L as any).markerClusterGroup) {
          stopClusterRef.current = (L as any).markerClusterGroup({
              showCoverageOnHover: false,
              spiderfyOnMaxZoom: true,
              disableClusteringAtZoom: 17,
              maxClusterRadius: 40
          });
          stopClusterRef.current.addTo(map);
      }

      busLayerRef.current.addTo(map);
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
    Object.values(buses).forEach((bus: Bus) => {
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
        const marker = L.marker([service.location.lat, service.location.lng], { 
          icon: createMicromobilityIcon(service) 
        })
        .addTo(micromobilityLayerRef.current);
        
        const isRequestInProgress = !!serviceToConfirm;
        const popupContent = `
             <div class="p-1">
                 <h4 class="font-bold text-white font-orbitron">${service.serviceName}</h4>
                 <p class="text-xs text-slate-300">${service.providerName} (${service.type})</p>
                 <button id="request-btn-${service.id}" class="w-full mt-2 ps-button active text-xs py-1 px-3">
                     Solicitar
                 </button>
             </div>
         `;
        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
            const btn = document.getElementById(`request-btn-${service.id}`);
            if (btn) btn.onclick = () => { onInitiateRequest(service.id); marker.closePopup(); };
        });

      });
  }, [micromobilityServices, onInitiateRequest, serviceToConfirm]);

  // FIX: Optimized bus stops update using CLUSTERING
  useEffect(() => {
    if (!stopClusterRef.current) return;
    stopClusterRef.current.clearLayers();
    
    const stops = selectedBusLineId ? busStops[selectedBusLineId] || [] : [];
    
    stops.forEach(stop => {
      const stopMarker = L.circleMarker([stop.location.lat, stop.location.lng], {
        radius: 6,
        fillColor: 'var(--ps-cyan)',
        color: '#FFF',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9
      });
      
      const popupId = `stop-nav-btn-${stop.id}`;
      stopMarker.bindPopup(`
         <div class="p-1">
            <h4 class="font-bold text-white font-orbitron text-sm">${stop.name}</h4>
            <button id="${popupId}" class="w-full mt-2 ps-button active text-[10px] py-1.5 flex items-center justify-center gap-2">
                <i class="fas fa-location-arrow"></i> TRAZAR RUTA (GPS)
            </button>
         </div>
      `, { closeButton: false });

      stopMarker.on('popupopen', () => {
          const btn = document.getElementById(popupId);
          if (btn) {
              btn.onclick = () => {
                  onNavigateToStopLocation(stop.location);
                  stopMarker.closePopup();
              };
          }
      });
      
      stopClusterRef.current.addLayer(stopMarker);
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

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
      <div className="w-full h-full rounded-lg overflow-hidden border-2 border-blue-500/30 relative">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-4 left-4 z-[1000] flex flex-col space-y-2">
            <button
              onClick={handleZoomIn}
              className="ps-button w-10 h-10 flex items-center justify-center"
              aria-label="Acercar mapa"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button
              onClick={handleZoomOut}
              className="ps-button w-10 h-10 flex items-center justify-center"
              aria-label="Alejar mapa"
            >
              <i className="fas fa-minus"></i>
            </button>
          </div>
      </div>
  );
};

export default MapDisplay;
