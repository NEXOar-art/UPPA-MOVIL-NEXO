
import React, { useState, useCallback } from 'react';
import { MicromobilityService, MicromobilityServiceType, GlobalChatMessage, UserProfile, RatingHistoryEntry } from '../types';
import { MICROMOBILITY_SERVICE_ICONS, UPPA_MERCADO_PAGO_ALIAS } from '../constants';
import MicromobilityChatWindow from './MicromobilityChatWindow';
import LoadingSpinner from './LoadingSpinner';
import { getReviewSummary } from '../services/geminiService';

interface MicromobilityServiceCardProps {
  service: MicromobilityService;
  onToggleAvailability?: (serviceId: string) => void;
  onToggleOccupied?: (serviceId: string) => void;
  onContact?: (whatsapp: string) => void;
  onConfirmPayment?: (serviceId: string) => void;
  isOwnService: boolean;
  currentUser: UserProfile;
}

const ACTIVATION_PIN = "0608"; // The required PIN

const formatRemainingTime = (expiry: number | null): string => {
    if (expiry === null) return "N/A";
    const now = Date.now();
    if (expiry < now) return "Expirado";

    const diff = expiry - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `Expira en: ${hours}h ${minutes}m`;
};

const MicromobilityServiceCard: React.FC<MicromobilityServiceCardProps> = ({
  service,
  onToggleAvailability,
  onToggleOccupied,
  onContact,
  onConfirmPayment,
  isOwnService,
  currentUser,
}) => {
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const cardBgColor = service.type === MicromobilityServiceType.Moto ? 'bg-sky-900/70 border-sky-500/30' : 'bg-indigo-900/70 border-indigo-500/30';
  const iconColor = service.type === MicromobilityServiceType.Moto ? 'text-sky-300' : 'text-indigo-300';

  let statusText = 'Desconocido';
  let statusBgColor = 'bg-slate-600 text-slate-100';
  const isExpired = service.subscriptionExpiryTimestamp !== null && service.subscriptionExpiryTimestamp < Date.now();

  if (isExpired) {
    statusText = 'Expirado';
    statusBgColor = 'bg-red-800 text-white';
  } else if (service.isPendingPayment) {
    statusText = 'Pendiente Activación';
    statusBgColor = 'bg-yellow-600 text-white';
  } else if (!service.isActive) {
    statusText = 'Inactivo';
    statusBgColor = 'bg-red-700 text-white';
  } else { 
    if (service.isAvailable) {
      statusText = service.isOccupied ? 'Ocupado' : 'Disponible';
      statusBgColor = service.isOccupied ? 'bg-orange-500 text-white' : 'bg-green-500 text-white';
    } else {
      statusText = 'No Disponible';
      statusBgColor = 'bg-slate-500 text-slate-200';
    }
  }

  const handleInitialConfirmPaymentClick = () => {
    setShowPinInput(true);
    setPinError(null);
    setPinValue('');
  };

  const handleVerifyPinAndActivate = () => {
    if (pinValue === ACTIVATION_PIN) {
      onConfirmPayment?.(service.id);
      setShowPinInput(false);
      setPinValue('');
      setPinError(null);
    } else {
      setPinError("PIN incorrecto. Intenta de nuevo.");
      setPinValue('');
    }
  };

  const handleCancelPinInput = () => {
    setShowPinInput(false);
    setPinValue('');
    setPinError(null);
  }

  const fetchAiSummary = useCallback(() => {
    const comments = service.ratingHistory.map(r => r.comment).filter(Boolean) as string[];
    if (comments.length < 2) {
        setAiSummary("No hay suficientes comentarios para generar un resumen.");
        return;
    }
    setIsSummaryLoading(true);
    getReviewSummary(comments)
        .then(setAiSummary)
        .catch(() => setAiSummary("Error al generar el resumen."))
        .finally(() => setIsSummaryLoading(false));
  }, [service.ratingHistory]);

  const detailItems = [
    { label: 'Puntualidad', value: service.avgPunctuality, icon: 'fa-clock' },
    { label: 'Seguridad', value: service.avgSafety, icon: 'fa-shield-alt' },
    { label: 'Limpieza', value: service.avgCleanliness, icon: 'fa-soap' },
    { label: 'Amabilidad', value: service.avgKindness, icon: 'fa-handshake' },
    { label: 'Eco Score', value: service.ecoScore, icon: 'fa-leaf', maxValue: 100 }
  ];

  return (
    <div className={`p-3 rounded-lg shadow-md border ${cardBgColor} transition-all duration-300`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className={`text-md font-semibold text-white flex items-center`}>
            <i className={`${MICROMOBILITY_SERVICE_ICONS[service.type]} ${iconColor} mr-2 text-lg`}></i>
            {service.serviceName}
             {service.petsAllowed && (
                <i className="fas fa-paw text-cyan-300 icon-pet-glow text-base ml-2" title="Mascotas Bienvenidas"></i>
            )}
          </h4>
          <p className="text-xs text-slate-400">{isOwnService ? 'Mi Servicio' : service.providerName} ({service.type})</p>
        </div>
        <div className="text-right flex-shrink-0">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBgColor}`}>
                {statusText}
            </span>
        </div>
      </div>
      
      <p className="text-sm text-slate-300 mb-1">
        <i className="fas fa-car-side mr-1 opacity-70"></i> Vehículo: {service.vehicleModel} ({service.vehicleColor})
      </p>
      
      {isOwnService && service.subscriptionExpiryTimestamp && !isExpired &&(
         <p className="text-xs text-slate-400">
            <i className="fas fa-stopwatch mr-1.5 opacity-70"></i> {formatRemainingTime(service.subscriptionExpiryTimestamp)}
         </p>
      )}

      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center text-yellow-400" title={`Rating promedio: ${service.rating.toFixed(2)}`}>
            {[...Array(5)].map((_, i) => (
                <i key={i} className={`fa-star ${i < Math.round(service.rating) ? 'fas' : 'far'}`}></i>
            ))}
             <span className="text-xs text-slate-400 ml-1.5">({service.rating.toFixed(1)})</span>
        </div>
        <button onClick={() => setShowDetails(!showDetails)} className="text-xs text-cyan-400 hover:text-cyan-200 transition-colors">
            {service.numberOfRatings} Votos <i className={`fas fa-chevron-down text-slate-500 ml-1 transition-transform ${showDetails ? 'rotate-180' : ''}`}></i>
        </button>
      </div>

      {showDetails && (
          <div className="mt-3 pt-3 border-t border-blue-500/20 space-y-3">
              <h5 className="text-sm font-semibold text-white text-center">Métricas de la Comunidad</h5>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {detailItems.map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                        <span className="text-slate-300 flex items-center"><i className={`${item.icon} mr-2 w-4 text-center text-cyan-400/80`}></i>{item.label}</span>
                        <span className="font-mono text-white">{item.value.toFixed(1)}<span className="text-slate-500">/{item.maxValue || 5}</span></span>
                    </div>
                ))}
              </div>
               <button onClick={fetchAiSummary} disabled={isSummaryLoading} className="w-full text-xs ps-button flex items-center justify-center space-x-2">
                    {isSummaryLoading ? <LoadingSpinner size="w-4 h-4" /> : <i className="fas fa-brain"></i>}
                    <span>Resumen IA</span>
                </button>
                {aiSummary && <p className="text-xs text-slate-300 italic p-2 bg-slate-900/50 rounded-md">"{aiSummary}"</p>}
          </div>
      )}

      {isOwnService && isExpired && (
        <div className="mt-3 text-center text-sm text-red-300 bg-red-900/50 p-2 rounded-md border border-red-700">
           <i className="fas fa-exclamation-triangle mr-1"></i> Tu publicación ha expirado. Registra una nueva entrada para volver a estar visible.
        </div>
      )}

      {isOwnService && service.isPendingPayment && (
        <div className="mt-3 p-3 bg-yellow-900/60 rounded-md border border-yellow-700/50">
          <h5 className="text-sm font-semibold text-yellow-200 mb-2">Activar Servicio</h5>
          <div className="bg-black/20 p-2 rounded border border-yellow-500/20 mb-3">
            <p className="text-[10px] text-yellow-300 uppercase font-black mb-1">Paso 1: Abonar Entrada</p>
            <p className="text-xs text-white">Mercado Pago Alias: <strong className="text-yellow-400 select-all">{UPPA_MERCADO_PAGO_ALIAS}</strong></p>
          </div>

          {!showPinInput ? (
            <button
              onClick={handleInitialConfirmPaymentClick}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black py-2.5 px-3 rounded-md shadow-lg transition-all text-[10px] flex items-center justify-center space-x-2 uppercase tracking-widest"
              aria-label="Confirmar que el pago ha sido realizado e ingresar PIN"
            >
              <i className="fas fa-money-check-alt"></i> <span>He Pagado, Ingresar PIN</span>
            </button>
          ) : (
            <div className="space-y-3 mt-1 animate-[preloader-fade-in_0.3s_ease-out]">
              <div>
                <label htmlFor={`pin-${service.id}`} className="block text-[10px] font-black text-yellow-200 mb-1 uppercase tracking-wider">PIN de Activación:</label>
                <input
                  type="password"
                  id={`pin-${service.id}`}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value)}
                  maxLength={4}
                  className="w-full p-2.5 bg-black/60 border border-yellow-500/40 rounded-lg text-yellow-100 placeholder-yellow-800 text-center font-mono text-lg tracking-[0.5em] focus:ring-2 focus:ring-yellow-400 outline-none"
                  placeholder="****"
                  aria-label="PIN de activación"
                  autoComplete="off"
                />
              </div>
              {pinError && <p className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 text-center font-bold">{pinError}</p>}
              <div className="flex gap-2">
                <button
                    onClick={handleCancelPinInput}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3 rounded-lg text-[10px] uppercase transition-colors"
                    aria-label="Cancelar ingreso de PIN"
                    >
                    Cancelar
                </button>
                <button
                  onClick={handleVerifyPinAndActivate}
                  disabled={pinValue.length !== 4}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-2 px-3 rounded-lg text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 disabled:opacity-30 transition-all"
                  aria-label="Verificar PIN y Activar Servicio"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isOwnService && !service.isPendingPayment && service.isActive && !isExpired && onToggleAvailability && onToggleOccupied && (
        <div className="mt-3 grid grid-cols-2 gap-2">
            <button
            onClick={() => onToggleAvailability(service.id)}
            className={`w-full font-semibold py-2 px-3 rounded-md shadow-sm transition-colors text-xs
                        ${service.isAvailable ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            aria-label={service.isAvailable ? "Marcar como No Disponible" : "Marcar como Disponible"}
            >
            {service.isAvailable ? (
                <><i className="fas fa-times-circle mr-1"></i>No Disp.</>
            ) : (
                <><i className="fas fa-check-circle mr-1"></i>Disponible</>
            )}
            </button>
            
            <button
                onClick={() => onToggleOccupied(service.id)}
                disabled={!service.isAvailable}
                className={`w-full font-semibold py-2 px-3 rounded-md shadow-sm transition-colors text-xs
                            ${service.isOccupied ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-black'}
                            disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed`}
                aria-label={service.isOccupied ? "Marcar como Desocupado" : "Marcar como Ocupado"}
                >
                {service.isOccupied ? (
                    <><i className="fas fa-user-check mr-1"></i>Desocupado</>
                ) : (
                    <><i className="fas fa-user-clock mr-1"></i>Ocupado</>
                )}
            </button>
        </div>
      )}

      {!isOwnService && service.isActive && service.isAvailable && !service.isOccupied && onContact && (
        <div className="mt-3 pt-3 border-t border-blue-500/20">
            <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <i className="fab fa-whatsapp text-green-400"></i>
                    {service.whatsapp}
                </span>
                <button
                    onClick={() => onContact(service.whatsapp)}
                    className="ps-button text-xs px-3 py-1"
                >
                    Chatear
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default MicromobilityServiceCard;
