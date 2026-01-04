
import React, { useState } from 'react';
import { MicromobilityServiceType, UserProfile, Coordinates } from '../types';
import { MICROMOBILITY_PRICING, MICROMOBILITY_TERMS_CONTENT } from '../constants';
import { getAddressFromCoordinates, fetchPlaceDetails } from '../services/geolocationService';
import LoadingSpinner from './LoadingSpinner';

type RegistrationFormData = {
  serviceName: string;
  type: MicromobilityServiceType;
  vehicleModel: string;
  vehicleColor: string;
  whatsapp: string;
  location: Coordinates;
  address: string;
  petsAllowed: boolean;
  subscriptionDurationHours: number;
}

interface MicromobilityRegistrationModalProps {
  currentUser: UserProfile;
  userLocation: Coordinates | null;
  onSubmit: (formData: RegistrationFormData) => void;
  onClose: () => void;
}

const getCurrentLocationPromise = (): Promise<Coordinates | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn(`Error getting location: ${error.message}`);
        resolve(null);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  });
};

const MicromobilityRegistrationModal: React.FC<MicromobilityRegistrationModalProps> = ({ currentUser, userLocation, onSubmit, onClose }) => {
  const [serviceName, setServiceName] = useState('');
  const [type, setType] = useState<MicromobilityServiceType>(MicromobilityServiceType.Moto);
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [subscriptionDurationHours, setSubscriptionDurationHours] = useState<number | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleGetLocation = async () => {
    setIsFetchingLocation(true);
    setLocationError(null);
    
    let coords = await getCurrentLocationPromise();
    if (!coords && userLocation) coords = userLocation;

    if (coords) {
      setLocation(coords);
      try {
        const fetchedAddress = await getAddressFromCoordinates(coords);
        setAddress(fetchedAddress || `Coordenadas: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      } catch (error) {
        setAddress(`Ubicación GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      }
    } else {
      setLocationError("No se pudo detectar el GPS. Prueba búsqueda manual.");
    }
    setIsFetchingLocation(false);
  };

  const handleManualSearch = async () => {
    if (!manualAddress.trim()) return;
    setIsSearchingAddress(true);
    try {
        const details = await fetchPlaceDetails(manualAddress);
        if (details) {
            setLocation(details.location);
            setAddress(details.formattedAddress);
            setManualAddress(details.formattedAddress);
        }
    } catch (error) {
        setLocationError("No se encontró la dirección.");
    } finally {
        setIsSearchingAddress(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceName.trim() || !vehicleModel.trim() || !whatsapp.trim()) {
      alert("Completa los datos del piloto.");
      return;
    }
    if (!location) {
      alert("Fija tu ubicación para continuar.");
      return;
    }
    if (subscriptionDurationHours === null) {
      alert("Selecciona un abono de visibilidad.");
      return;
    }
    if (!termsAccepted) {
        alert("Debes aceptar los términos de responsabilidad para continuar.");
        return;
    }
    
    setIsSubmitting(true);

    const formData: RegistrationFormData = {
      serviceName: serviceName.trim(),
      type,
      vehicleModel: vehicleModel.trim(),
      vehicleColor: vehicleColor.trim(),
      whatsapp: whatsapp.trim().replace(/\D/g, ''),
      location,
      address: address || "Ubicación fijada por GPS",
      petsAllowed,
      subscriptionDurationHours,
    };
    
    onSubmit(formData);
  };

  const currentPrice = subscriptionDurationHours ? MICROMOBILITY_PRICING[type][subscriptionDurationHours] : 0;
  const hasEnoughTokens = currentUser.tokens >= currentPrice;

  const canSubmit = !isSubmitting && hasEnoughTokens && !!location && termsAccepted && subscriptionDurationHours !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-gray-200 pb-6">
      <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30 text-[10px] text-slate-300">
          <i className="fas fa-info-circle text-cyan-400 mr-2"></i>
          Paso 1: Registra tu unidad. Paso 2: Abona la entrada para aparecer en el mapa.
      </div>

      <div className="space-y-4">
        <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Identificador de Unidad</label>
            <input
              type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)}
              className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="Ej: Moto-Relámpago Campana" required
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tipo de Servicio</label>
                <select
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value as MicromobilityServiceType);
                        setSubscriptionDurationHours(null);
                    }}
                    className="w-full p-3 ps-input bg-black/40 border-white/10"
                >
                    {Object.values(MicromobilityServiceType).map(item => (
                    <option key={item} value={item} className="bg-slate-800">{item}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">WhatsApp de Contacto</label>
                <input
                    type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="11..." required
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <input
                type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="Modelo de Vehículo" required
            />
            <input
                type="text" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)}
                className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="Color" required
            />
        </div>
      </div>

      <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-4">
        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Base de Operaciones</label>
        <button
            type="button" onClick={handleGetLocation} disabled={isFetchingLocation}
            className={`w-full ps-button active flex items-center justify-center space-x-3 py-3 ${location ? 'border-green-500 text-green-300 bg-green-500/10' : ''}`}
        >
            {isFetchingLocation ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-location-crosshairs"></i>}
            <span>{location ? 'UBICACIÓN FIJADA' : 'FIJAR MI BASE ACTUAL (GPS)'}</span>
        </button>

        <div className="flex items-center gap-2">
            <input
                type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)}
                placeholder="O busca una dirección manual..." className="flex-grow ps-input text-xs py-2 bg-black/20"
            />
            <button type="button" onClick={handleManualSearch} className="ps-button p-2.5" title="Buscar"><i className="fas fa-search"></i></button>
        </div>
        {address && <p className="text-[9px] text-cyan-500 truncate font-mono italic px-1">{address}</p>}
      </div>
      
      <div className="space-y-3">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seleccionar Abono de Visibilidad</label>
        <div className="grid grid-cols-5 gap-2">
            {Object.entries(MICROMOBILITY_PRICING[type]).map(([hours, price]) => (
                 <button
                    type="button" key={hours} onClick={() => setSubscriptionDurationHours(Number(hours))}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all 
                                ${subscriptionDurationHours === Number(hours) ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-900 border-white/5 opacity-50 hover:opacity-100'}`
                    }
                >
                    <span className="text-xs font-black text-white">{hours}H</span>
                    <span className="text-[8px] text-yellow-400 font-mono">${price}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="space-y-2">
          <button 
            type="button" 
            onClick={() => setShowTerms(!showTerms)}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <i className={`fas ${showTerms ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            {showTerms ? 'Ocultar' : 'Leer'} Política de Responsabilidad
          </button>
          
          {showTerms && (
              <div className="bg-black/40 border border-white/5 p-4 rounded-lg max-h-40 overflow-y-auto scrollbar-thin text-[10px] text-slate-400 leading-relaxed space-y-3 animate-[preloader-fade-in_0.3s_ease-out]">
                  <h4 className="font-bold text-slate-200 uppercase">{MICROMOBILITY_TERMS_CONTENT.title}</h4>
                  {MICROMOBILITY_TERMS_CONTENT.sections.map((sec, idx) => (
                      <div key={idx}>
                          <p className="font-bold text-cyan-500/80"><i className={`fas ${sec.icon} mr-1`}></i> {sec.title}</p>
                          <p>{sec.content}</p>
                      </div>
                  ))}
                  <p className="italic border-t border-white/5 pt-2">{MICROMOBILITY_TERMS_CONTENT.conclusion}</p>
              </div>
          )}

          <div className="flex items-center gap-3 px-1 pt-2">
              <input 
                  type="checkbox" id="termsAccepted" checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 rounded bg-black/40 border-white/10 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="termsAccepted" className="text-[10px] font-bold text-slate-300 cursor-pointer uppercase tracking-tighter">
                  Acepto los términos de responsabilidad de la Red Urbana
              </label>
          </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs text-slate-500 hover:text-white transition-colors" disabled={isSubmitting}>Cancelar</button>
        <button
          type="submit" disabled={!canSubmit}
          className="ps-button active px-10 py-2.5 text-xs flex items-center justify-center shadow-lg disabled:opacity-30 disabled:grayscale transition-all"
        >
          {isSubmitting ? <LoadingSpinner size="w-4 h-4" /> : <><i className="fas fa-satellite-dish mr-2"></i> REGISTRAR UNIDAD</>}
        </button>
      </div>
    </form>
  );
};

export default MicromobilityRegistrationModal;
