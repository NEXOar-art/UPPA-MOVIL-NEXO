import React, { useState } from 'react';
import { Coordinates, TravelMode } from '../types';

interface PointsOfInterestProps {
  onNavigate: (destination: Coordinates, travelMode: TravelMode) => void;
}

const POI_DATA = [
  {
    id: 'mcdonalds-campana',
    name: "McDonald's 24hs",
    description: "Campana",
    icon: 'fas fa-hamburger',
    iconClasses: 'text-red-500',
    containerClasses: 'bg-yellow-400 shadow-yellow-400/50 border-red-500',
    coordinates: { lat: -34.191397, lng: -58.944674 },
    travelMode: 'DRIVE' as TravelMode,
  },
  {
    id: 'parador-campana',
    name: "Parador Campana",
    description: "Ruta 9",
    icon: 'fas fa-coffee',
    iconClasses: 'text-white',
    containerClasses: 'bg-blue-600 shadow-blue-500/50 border-blue-400',
    coordinates: { lat: -34.190111, lng: -58.945652 },
    travelMode: 'DRIVE' as TravelMode,
  }
];

const PointsOfInterest: React.FC<PointsOfInterestProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ps-card p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left"
        aria-expanded={isOpen}
        aria-controls="poi-list"
      >
        <h3 className="text-lg font-orbitron text-amber-300 flex items-center">
          <i className="fas fa-star text-amber-400 mr-3"></i>
          Puntos de Interés
        </h3>
        <i className={`fas fa-chevron-down text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div id="poi-list" className="mt-4 pt-4 border-t border-amber-500/20 animate-[preloader-fade-in_0.3s_ease-out]">
          <div className="space-y-3">
            {POI_DATA.map(poi => (
              <div key={poi.id} className="p-3 bg-slate-900/50 rounded-lg flex items-center justify-between gap-3 border border-slate-700/80">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                        shadow-lg border-2
                        ${poi.containerClasses}
                    `}>
                        <i className={`${poi.icon} ${poi.iconClasses} text-2xl`}></i>
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-semibold text-white truncate" title={poi.name}>{poi.name}</p>
                        <p className="text-xs text-slate-400 truncate" title={poi.description}>
                            {poi.description}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onNavigate(poi.coordinates, poi.travelMode)}
                    className="ps-button active whitespace-nowrap px-3 py-1.5 text-xs"
                    title={`Trazar ruta a ${poi.name}`}
                >
                    <i className="fas fa-route mr-2"></i>
                    Ir Ahora
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsOfInterest;