
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MicromobilityServiceType, UserProfile, Coordinates } from '../types';
import { MICROMOBILITY_PRICING } from '../constants';
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
        console.warn(`Error getting location (Code ${error.code}): ${error.message}`);
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
  
  // Terms and Conditions states
  const [showTerms, setShowTerms] = useState(false);
  const [termsRead, setTermsRead] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Tolerance of 5px to ensure it triggers easily on most screens
    if (scrollHeight - scrollTop <= clientHeight + 5) {
      setTermsRead(true);
    }
  };

  const handleGetLocation = async () => {
    setIsFetchingLocation(true);
    setLocationError(null);
    
    let coords = await getCurrentLocationPromise();
    
    if (!coords && userLocation) {
        coords = userLocation;
    }

    if (coords) {
      setLocation(coords);
      try {
        const fetchedAddress = await getAddressFromCoordinates(coords);
        setAddress(fetchedAddress);
      } catch (error) {
        setAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      }
    } else {
      setLocationError("No se pudo obtener la ubicación automáticamente. Por favor, usa la búsqueda manual.");
    }
    setIsFetchingLocation(false);
  };

  const handleManualSearch = async () => {
    if (!manualAddress.trim()) return;
    setIsSearchingAddress(true);
    setLocationError(null);
    try {
        const details = await fetchPlaceDetails(manualAddress);
        if (details) {
            setLocation(details.location);
            setAddress(details.formattedAddress);
            setManualAddress(details.formattedAddress);
        }
    } catch (error) {
        setLocationError("No se encontró la dirección ingresada.");
    } finally {
        setIsSearchingAddress(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceName.trim() || !vehicleModel.trim() || !vehicleColor.trim() || !whatsapp.trim()) {
      alert("Por favor, completa todos los campos del vehículo y contacto.");
      return;
    }
    if (!location || !address) {
      alert("La ubicación es obligatoria para ser visible en el mapa.");
      return;
    }
    if (subscriptionDurationHours === null) {
      alert("Selecciona un tiempo de permanencia en la red.");
      return;
    }
    if (!termsAccepted) {
      alert("Debes leer y aceptar la Política de Responsabilidad para continuar.");
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
      address,
      petsAllowed,
      subscriptionDurationHours,
    };
    
    onSubmit(formData);
  };

  const currentPrice = subscriptionDurationHours ? MICROMOBILITY_PRICING[type][subscriptionDurationHours] : 0;
  const hasEnoughTokens = currentUser.tokens >= currentPrice;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-gray-200 pb-10">
      <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30 text-[10px] text-slate-300">
          <i className="fas fa-satellite-dish text-cyan-400 mr-2"></i>
          Completa el registro para desplegar tu unidad en la Red Urbana.
      </div>

      <div className="space-y-4">
        <div>
            <label htmlFor="serviceName" className="block text-xs font-bold font-orbitron text-cyan-400 mb-1 uppercase tracking-wider">Identificador de Misión</label>
            <input
              id="serviceName" type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)}
              className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="Ej: Moto-Relámpago Campana" required
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="serviceType" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tipo</label>
                <select
                    id="serviceType" value={type}
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
                <label htmlFor="whatsapp" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">WhatsApp (Sin +54)</label>
                <input
                    id="whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="1122334455" required
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="vehicleModel" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Modelo / Marca</label>
                <input
                    id="vehicleModel" type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="Honda Wave, etc." required
                />
            </div>
            <div>
                <label htmlFor="vehicleColor" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Color</label>
                <input
                    id="vehicleColor" type="text" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)}
                    className="w-full p-3 ps-input bg-black/40 border-white/10" placeholder="Rojo, Negro..." required
                />
            </div>
        </div>

        <div className="flex items-center gap-2 px-1">
            <input 
                type="checkbox" id="petsAllowed" checked={petsAllowed} 
                onChange={(e) => setPetsAllowed(e.target.checked)}
                className="w-4 h-4 rounded bg-black/40 border-white/10 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="petsAllowed" className="text-xs text-slate-300 flex items-center gap-2">
                <i className="fas fa-paw text-cyan-400"></i> ¿Aceptas mascotas en el viaje?
            </label>
        </div>
      </div>

      <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
            <label className="block text-xs font-black font-orbitron text-cyan-400 uppercase tracking-widest">Base de Operación</label>
            {location && <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 font-bold">POSICIÓN FIJADA</span>}
        </div>
        
        <button
            type="button"
            onClick={handleGetLocation}
            disabled={isFetchingLocation}
            className={`w-full ps-button active flex items-center justify-center space-x-3 py-3 transition-all ${location ? 'border-green-500 text-green-300 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : ''}`}
        >
            {isFetchingLocation ? <LoadingSpinner size="w-4 h-4" /> : <i className="fas fa-location-crosshairs"></i>}
            <span>{location ? 'ACTUALIZAR GPS' : 'FIJAR MI UBICACIÓN ACTUAL'}</span>
        </button>

        <div className="relative pt-1">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="O busca tu base manualmente..."
                    className="flex-grow ps-input text-xs py-2 bg-black/20"
                />
                <button
                    type="button"
                    onClick={handleManualSearch}
                    disabled={isSearchingAddress}
                    className="ps-button p-2.5 aspect-square flex items-center justify-center"
                >
                    {isSearchingAddress ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                </button>
            </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Abono de Visibilidad</label>
        <div className="grid grid-cols-5 gap-2">
            {Object.entries(MICROMOBILITY_PRICING[type]).map(([hours, price]) => (
                 <button
                    type="button"
                    key={`${type}-${hours}`}
                    onClick={() => setSubscriptionDurationHours(Number(hours))}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all 
                                ${subscriptionDurationHours === Number(hours) 
                                    ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]' 
                                    : 'bg-slate-900 border-white/5 opacity-50 hover:opacity-100 hover:border-white/20'}`
                    }
                >
                    <span className="text-xs font-black text-white">{hours}H</span>
                    <span className="text-[8px] text-yellow-400 font-mono mt-0.5">${price}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Terms and Conditions Section */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <i className="fas fa-scroll text-cyan-400 text-xs"></i>
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Política de Responsabilidad</h4>
            </div>
            <button 
                type="button" 
                onClick={() => setShowTerms(!showTerms)}
                className="text-[9px] bg-white/5 hover:bg-white/10 text-cyan-300 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
                <i className={`fas ${showTerms ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                {showTerms ? 'CONTRAER' : 'LEER TÉRMINOS'}
            </button>
        </div>

        {showTerms && (
            <div 
                ref={termsScrollRef}
                onScroll={handleTermsScroll}
                className="max-h-32 overflow-y-auto scrollbar-thin bg-black/40 p-3 rounded-lg border border-white/5 text-[10px] text-slate-400 leading-relaxed space-y-2"
            >
                <p className="font-bold text-slate-200">📜 Política de Responsabilidad y Transacciones</p>
                <p><strong>1. Naturaleza de los Servicios:</strong> La aplicación actúa únicamente como un intermediario tecnológico que conecta a usuarios con prestadores de servicios de movilidad alternativa (pilotos). La plataforma no presta directamente servicios de transporte ni de movilidad.</p>
                <p><strong>2. Responsabilidad de las Transacciones:</strong> Todas las transacciones económicas, acuerdos de viaje y condiciones de servicio se realizan de manera exclusiva entre el usuario y el piloto. La plataforma no interviene en la negociación de tarifas, métodos de pago ni en la ejecución del servicio contratado.</p>
                <p><strong>3. Limitación de Responsabilidad de la Plataforma:</strong> La aplicación no se hace responsable por: Accidentes, incidentes o daños ocurridos durante el servicio; Pérdidas materiales o personales derivadas del uso del servicio; Incumplimientos, retrasos o cancelaciones por parte de los pilotos o usuarios. La responsabilidad recae exclusivamente en las partes involucradas (usuario y piloto).</p>
                <p><strong>4. Obligaciones del Usuario y del Piloto:</strong> El usuario es responsable de verificar las condiciones del servicio antes de aceptarlo. El piloto es responsable de cumplir con las normativas locales de tránsito, seguridad y habilitación correspondientes. Ambas partes aceptan que cualquier conflicto deberá resolverse directamente entre ellas, sin intervención de la plataforma.</p>
                <p><strong>5. Aceptación de la Política:</strong> Al utilizar la aplicación y acceder a los servicios de movilidad alternativa, tanto el usuario como el piloto reconocen y aceptan que la plataforma no tiene responsabilidad alguna sobre las transacciones ni sobre la prestación del servicio.</p>
                <div className="text-center pt-2 text-cyan-400 font-bold animate-pulse">--- FIN DEL DOCUMENTO ---</div>
            </div>
        )}

        <div className="flex items-center gap-3 mt-2 px-1">
            <input 
                type="checkbox" 
                id="termsAccepted" 
                checked={termsAccepted} 
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={!termsRead}
                className={`w-4 h-4 rounded bg-black/40 border-white/10 text-cyan-500 focus:ring-cyan-500 ${!termsRead ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
            />
            <label htmlFor="termsAccepted" className={`text-[10px] font-bold ${!termsRead ? 'text-slate-600' : 'text-slate-300'}`}>
                {termsRead ? 'ACEPTO LA POLÍTICA DE RESPONSABILIDAD' : 'LEE HASTA EL FINAL PARA ACEPTAR'}
            </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs text-slate-500 hover:text-white transition-colors" disabled={isSubmitting}>
          Cerrar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !hasEnoughTokens || !location || !termsAccepted}
          className="ps-button active px-10 py-2.5 text-xs flex items-center justify-center shadow-lg disabled:grayscale disabled:opacity-30 group"
        >
          {isSubmitting ? (
            <><LoadingSpinner size="w-4 h-4 mr-2" /> ENVIANDO...</>
          ) : (
            <><i className="fas fa-fighter-jet mr-2 group-hover:translate-x-1 transition-transform"></i> INICIAR MISIÓN</>
          )}
        </button>
      </div>
    </form>
  );
};

export default MicromobilityRegistrationModal;
