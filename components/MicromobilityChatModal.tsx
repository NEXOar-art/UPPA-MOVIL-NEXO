import React from 'react';
import { GlobalChatMessage, UserProfile, MicromobilityService } from '../types';
import Modal from './Modal';
import MicromobilityChatWindow from './MicromobilityChatWindow';
import MicromobilityServiceCard from './MicromobilityServiceCard';

interface MicromobilityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: GlobalChatMessage[];
  currentUser: UserProfile;
  onSendMessage: (message: GlobalChatMessage) => void;
  services: MicromobilityService[];
  onOpenRegistration: () => void;
  onToggleAvailability: (serviceId: string) => void;
  onToggleOccupied: (serviceId: string) => void;
  onConfirmPayment: (serviceId: string) => void;
}

const MicromobilityChatModal: React.FC<MicromobilityChatModalProps> = ({
  isOpen,
  onClose,
  messages,
  currentUser,
  onSendMessage,
  services,
  onOpenRegistration,
  onToggleAvailability,
  onToggleOccupied,
  onConfirmPayment
}) => {
  const myServices = services.filter(s => s.providerId === currentUser.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nexo de Micromovilidad">
      <div className="h-[75vh] flex flex-col space-y-4">
        {/* My Services Section */}
        <div className="ps-card p-3">
            <h3 className="text-lg font-orbitron text-cyan-300 mb-2">Mis Servicios</h3>
            <div className="max-h-48 overflow-y-auto scrollbar-thin pr-2 -mr-2">
                {myServices.length === 0 ? (
                    <p className="text-sm text-slate-400 italic my-2">No tienes servicios registrados.</p>
                ) : (
                    <div className="space-y-2">
                        {myServices.map(service => (
                            // FIX: Removed `chatMessages` and `onSendMessage` props as they are not defined in `MicromobilityServiceCardProps`.
                            <MicromobilityServiceCard 
                                key={service.id}
                                service={service}
                                isOwnService={true}
                                onToggleAvailability={onToggleAvailability}
                                onToggleOccupied={(serviceId) => onToggleOccupied(serviceId)}
                                onConfirmPayment={onConfirmPayment}
                                currentUser={currentUser}
                            />
                        ))}
                    </div>
                )}
            </div>
            <button onClick={onOpenRegistration} className="ps-button w-full mt-3">
                <i className="fas fa-plus-circle mr-2"></i> Registrar Nuevo Servicio
            </button>
        </div>

        {/* Global Chat Section */}
        <div className="flex-grow flex flex-col ps-card p-3 min-h-0">
          <h3 className="text-lg font-orbitron text-fuchsia-300 mb-2">Nexo de Comunicación Global</h3>
          <p className="text-xs text-slate-400 mb-2">
            Canal para todos los pilotos y pasajeros.
          </p>
          <div className="flex-grow min-h-0">
            <MicromobilityChatWindow
                messages={messages}
                currentUser={currentUser}
                onSendMessage={onSendMessage}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MicromobilityChatModal;