import React, { useState } from 'react';
import { GlobalChatMessage, UserProfile, MicromobilityService } from '../types';
import Modal from './Modal';
import MicromobilityChatWindow from './MicromobilityChatWindow';
import MicromobilityServiceCard from './MicromobilityServiceCard';

type PrivateChat = {
    participants: { id: string; name: string }[];
    messages: GlobalChatMessage[];
}

interface MicromobilityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: GlobalChatMessage[];
  currentUser: UserProfile;
  onSendMessage: (message: GlobalChatMessage) => void;
  privateChats: Record<string, PrivateChat>;
  onSendPrivateMessage: (chatId: string, message: GlobalChatMessage) => void;
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
  privateChats,
  onSendPrivateMessage,
  services,
  onOpenRegistration,
  onToggleAvailability,
  onToggleOccupied,
  onConfirmPayment
}) => {
  const myServices = services.filter(s => s.providerId === currentUser.id);
  const [activeChatId, setActiveChatId] = useState<string>('global');

  // FIX: Explicitly type the destructured `chat` as `PrivateChat` because `Object.entries` can be inferred as `[string, unknown][]`.
  const myPrivateChats = Object.entries(privateChats).filter(([, chat]) =>
    (chat as PrivateChat).participants.some(p => p.id === currentUser.id)
  );

  const activeMessages = activeChatId === 'global'
    ? messages
    : privateChats[activeChatId]?.messages || [];

  const handleSendMessageInModal = (message: GlobalChatMessage) => {
      if (activeChatId === 'global') {
          onSendMessage(message);
      } else {
          onSendPrivateMessage(activeChatId, message);
      }
  };

  const getChatPartnerName = (chat: PrivateChat) => {
      const partner = chat.participants.find(p => p.id !== currentUser.id);
      return partner ? partner.name : 'Desconocido';
  };

  const modalTitle = activeChatId === 'global' ? "Nexo de Micromovilidad" : `Chat con ${getChatPartnerName(privateChats[activeChatId])}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
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
                            <MicromobilityServiceCard 
                                key={service.id}
                                service={service}
                                isOwnService={true}
                                onToggleAvailability={onToggleAvailability}
                                onToggleOccupied={onToggleOccupied}
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

        {/* Chat Selection */}
        <div className="flex-shrink-0">
             <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-md">
                <button
                    onClick={() => setActiveChatId('global')}
                    className={`flex-1 text-sm py-1 rounded transition-colors ${activeChatId === 'global' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}
                >
                    Global
                </button>
                {myPrivateChats.map(([chatId, chat]) => {
                    // FIX: Assert the type of `chat` to `PrivateChat` to resolve inference issues with `Object.entries`.
                    const privateChat = chat as PrivateChat;
                    return (
                        <button
                            key={chatId}
                            onClick={() => setActiveChatId(chatId)}
                            className={`flex-1 text-sm py-1 rounded transition-colors truncate ${activeChatId === chatId ? 'bg-purple-500 text-white' : 'hover:bg-slate-700'}`}
                            title={`Chat con ${getChatPartnerName(privateChat)}`}
                        >
                            {getChatPartnerName(privateChat)}
                        </button>
                    )
                })}
             </div>
        </div>

        {/* Chat Section */}
        <div className="flex-grow flex flex-col ps-card p-3 min-h-0">
          {activeChatId === 'global' && (
            <>
                <h3 className="text-lg font-orbitron text-fuchsia-300 mb-2">Nexo de Comunicación Global</h3>
                <p className="text-xs text-slate-400 mb-2">Canal para todos los pilotos y pasajeros.</p>
            </>
          )}

          <div className="flex-grow min-h-0">
            <MicromobilityChatWindow
                messages={activeMessages}
                currentUser={currentUser}
                onSendMessage={handleSendMessageInModal}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MicromobilityChatModal;