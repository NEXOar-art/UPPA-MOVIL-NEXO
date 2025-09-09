import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Coordinates, RouteResult, PlaceAutocompleteSuggestion, TravelMode } from '../types';
import { fetchAutocompleteSuggestions, fetchPlaceDetails } from '../services/geolocationService';
import LoadingSpinner from './LoadingSpinner';
import { useSettings } from '../contexts/SettingsContext';

interface TripPlannerProps {
  onSetRoute: (origin: Coordinates, destination: Coordinates, travelMode: TravelMode) => void;
  onClearRoute: () => void;
  isRouteLoading: boolean;
}

const TripPlanner: React.FC<TripPlannerProps> = ({ 
    onSetRoute, 
    onClearRoute,
    isRouteLoading,
}) => {
  const { t } = useSettings();
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<PlaceAutocompleteSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceAutocompleteSuggestion[]>([]);
  const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVE');

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plannerRef.current && !plannerRef.current.contains(event.target as Node)) {
        setActiveInput(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (
    query: string, 
    type: 'origin' | 'destination'
  ) => {
    if (type === 'origin') {
      setOriginQuery(query);
      setOriginCoords(null);
    } else {
      setDestinationQuery(query);
      setDestinationCoords(null);
    }
    setActiveInput(type);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!query.trim()) {
        if(type === 'origin') setOriginSuggestions([]); else setDestinationSuggestions([]);
        return;
    }

    debounceTimeout.current = setTimeout(async () => {
      const suggestions = await fetchAutocompleteSuggestions(query);
      if (type === 'origin') {
        setOriginSuggestions(suggestions);
      } else {
        setDestinationSuggestions(suggestions);
      }
    }, 300);
  };

  const handleSuggestionClick = async (
    suggestion: PlaceAutocompleteSuggestion,
    type: 'origin' | 'destination'
  ) => {
    const { text } = suggestion.placePrediction;
    const placeName = text.text;
    
    if (type === 'origin') {
      setOriginQuery(placeName);
      setOriginSuggestions([]);
    } else {
      setDestinationQuery(placeName);
      setDestinationSuggestions([]);
    }
    setActiveInput(null);

    const details = await fetchPlaceDetails(placeName);
    if (details) {
      if (type === 'origin') {
        setOriginCoords(details.location);
      } else {
        setDestinationCoords(details.location);
      }
    }
  };

  const handleFindRoute = () => {
    if (originCoords && destinationCoords) {
      onSetRoute(originCoords, destinationCoords, travelMode);
    } else {
      alert("Por favor, selecciona un origen y un destino válidos de las sugerencias.");
    }
  };
  
  // Recalculate route when travel mode changes and a route is already set
  useEffect(() => {
    if (originCoords && destinationCoords) {
      handleFindRoute();
    }
  }, [travelMode, originCoords, destinationCoords]);

  const handleClear = () => {
    setOriginQuery('');
    setDestinationQuery('');
    setOriginCoords(null);
    setDestinationCoords(null);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setActiveInput(null);
    onClearRoute();
  };
  
  const SuggestionsList: React.FC<{
    suggestions: PlaceAutocompleteSuggestion[];
    onSelect: (suggestion: PlaceAutocompleteSuggestion) => void;
  }> = ({ suggestions, onSelect }) => (
    <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-blue-500/50 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto scrollbar-thin">
      <ul role="listbox">
        {suggestions.map((s, index) => (
          <li key={s.placePrediction.placeId + index} role="option" aria-selected="false">
            <button
              onClick={() => onSelect(s)}
              className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-blue-900/50"
            >
              {s.placePrediction.text.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
  
  const travelModeButtons = [
      { mode: 'DRIVE' as TravelMode, icon: 'fas fa-car', label: t('travelModeDrive') },
      { mode: 'WALK' as TravelMode, icon: 'fas fa-walking', label: t('travelModeWalk') },
  ]

  return (
    <div className="space-y-4" ref={plannerRef}>
      <h2 className="text-2xl font-bold text-blue-300 font-orbitron border-b border-blue-500/20 pb-2">{t('tripPlannerTitle')}</h2>
      <div className="space-y-3">
        <div className="relative">
          <label htmlFor="origin" className="block text-sm font-medium text-blue-300 mb-1">{t('originLabel')}</label>
          <input
            id="origin"
            type="text"
            className="w-full ps-input"
            placeholder={t('originPlaceholder')}
            value={originQuery}
            onChange={(e) => handleQueryChange(e.target.value, 'origin')}
            onFocus={() => setActiveInput('origin')}
            autoComplete="off"
            role="combobox"
            aria-expanded={activeInput === 'origin'}
            aria-controls="origin-suggestions"
          />
          {activeInput === 'origin' && originQuery && (
            <div id="origin-suggestions">
                <SuggestionsList suggestions={originSuggestions} onSelect={(s) => handleSuggestionClick(s, 'origin')} />
            </div>
          )}
        </div>
        <div className="relative">
          <label htmlFor="destination" className="block text-sm font-medium text-blue-300 mb-1">{t('destinationLabel')}</label>
          <input
            id="destination"
            type="text"
            className="w-full ps-input"
            placeholder={t('destinationPlaceholder')}
            value={destinationQuery}
            onChange={(e) => handleQueryChange(e.target.value, 'destination')}
            onFocus={() => setActiveInput('destination')}
            autoComplete="off"
            role="combobox"
            aria-expanded={activeInput === 'destination'}
            aria-controls="destination-suggestions"
          />
          {activeInput === 'destination' && destinationQuery && (
            <div id="destination-suggestions">
                <SuggestionsList suggestions={destinationSuggestions} onSelect={(s) => handleSuggestionClick(s, 'destination')} />
            </div>
          )}
        </div>
      </div>

       <div className="flex justify-center space-x-2 my-3">
            {travelModeButtons.map(btn => (
                <button
                    key={btn.mode}
                    onClick={() => setTravelMode(btn.mode)}
                    className={`ps-button px-4 py-2 flex items-center space-x-2 text-sm ${travelMode === btn.mode ? 'active' : ''}`}
                    title={`Calcular ruta en ${btn.label}`}
                >
                    <i className={btn.icon}></i>
                    <span>{btn.label}</span>
                </button>
            ))}
        </div>

      <div className="flex space-x-2">
        <button
          onClick={handleFindRoute}
          disabled={!originCoords || !destinationCoords || isRouteLoading}
          className="flex-1 ps-button active flex items-center justify-center"
        >
          {isRouteLoading ? <LoadingSpinner size="w-5 h-5"/> : <><i className="fas fa-route mr-2"></i>{t('findRouteButton')}</>}
        </button>
        <button
          onClick={handleClear}
          className="ps-button"
        >
          <i className="fas fa-times"></i> {t('clearButton')}
        </button>
      </div>
    </div>
  );
};

export default TripPlanner;