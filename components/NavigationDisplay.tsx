import React from 'react';
import { Maneuver } from '../types';

interface NavigationDisplayProps {
  currentStep: Maneuver;
  onEndNavigation: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  distanceToNextManeuver: number;
}

const getManeuverIcon = (type: string, modifier?: string): string => {
  if (type === 'arrive') return 'fas fa-flag-checkered';
  
  const mod = modifier || '';
  if (mod.includes('left')) return 'fas fa-arrow-left';
  if (mod.includes('right')) return 'fas fa-arrow-right';
  if (mod.includes('straight') || mod.includes('continue')) return 'fas fa-arrow-up';
  if (mod.includes('uturn')) return 'fas fa-undo';

  switch (type) {
    case 'depart': return 'fas fa-map-signs';
    case 'roundabout':
    case 'rotary':
      return 'fas fa-sync-alt';
    case 'fork': return 'fas fa-code-branch';
    default: return 'fas fa-directions';
  }
};

const NavigationDisplay: React.FC<NavigationDisplayProps> = ({
  currentStep,
  onEndNavigation,
  isMuted,
  onToggleMute,
  distanceToNextManeuver,
}) => {
  const iconClass = getManeuverIcon(currentStep.type, currentStep.modifier);
  
  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    }
    return `${(distance / 1000).toFixed(1)} km`;
  };

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-[1001]">
      <div className="ps-card p-3 bg-slate-900/90 border-2 border-cyan-400">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 text-5xl text-cyan-300 w-16 text-center">
            <i className={iconClass}></i>
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-sm text-slate-400 font-semibold">{formatDistance(distanceToNextManeuver)}</p>
            <h2 className="text-xl font-bold text-white truncate">{currentStep.instruction}</h2>
          </div>
          <div className="flex-shrink-0 flex flex-col gap-2">
             <button
              onClick={onToggleMute}
              className="w-10 h-10 ps-button"
              title={isMuted ? "Activar voz" : "Silenciar voz"}
            >
              <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
            </button>
            <button
              onClick={onEndNavigation}
              className="w-10 h-10 ps-button bg-red-600 hover:bg-red-700 border-red-500 hover:border-red-400"
              title="Finalizar Navegación"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationDisplay;
