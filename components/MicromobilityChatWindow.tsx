
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GlobalChatMessage, UserProfile } from '../types';
import { MICROMOBILITY_CHAT_EMOJIS, DEFAULT_USER_ID, DEFAULT_USER_NAME } from '../constants';
import { analyzeSentiment } from '../services/geminiService';

interface MicromobilityChatWindowProps {
  messages: GlobalChatMessage[];
  currentUser: UserProfile;
  onSendMessage: (message: GlobalChatMessage) => void;
}

const MicromobilityChatWindow: React.FC<MicromobilityChatWindowProps> = ({ messages, currentUser, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() && !selectedEmoji) return;
    setIsSending(true);

    const sentiment = await analyzeSentiment(newMessage || "emoji");

    const chatMessage: GlobalChatMessage = {
      id: `global-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: currentUser.id || DEFAULT_USER_ID,
      userName: currentUser.name || DEFAULT_USER_NAME,
      timestamp: Date.now(),
      text: newMessage.trim(),
      emoji: selectedEmoji || undefined,
      sentiment,
    };

    onSendMessage(chatMessage);
    setNewMessage('');
    setSelectedEmoji(null);
    setIsSending(false);
  }, [newMessage, selectedEmoji, currentUser, onSendMessage]);

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* Contenedor de Mensajes con scroll mejorado */}
      <div className="flex-grow p-4 space-y-6 overflow-y-auto scrollbar-thin scroll-smooth min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
            <i className="fas fa-comments text-7xl mb-6"></i>
            <p className="text-sm font-black font-orbitron tracking-[0.3em] uppercase">Canal Silencioso</p>
            <p className="text-[10px] font-mono mt-2">ESPERANDO TRANSMISIÓN COMUNITARIA</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === currentUser.id ? 'items-end' : 'items-start'} animate-[preloader-fade-in_0.3s_ease-out]`}>
            <div className={`max-w-[80%] lg:max-w-[70%] px-4 py-2.5 rounded-2xl relative shadow-2xl transition-all border ${
              msg.userId === currentUser.id 
                ? 'bg-cyan-600/10 border-cyan-500/40 rounded-tr-none' 
                : 'bg-slate-800/80 border-white/10 rounded-tl-none'
            }`}>
               <div className="flex items-center justify-between gap-4 mb-1.5">
                   <span className={`text-[9px] font-black uppercase tracking-[0.15em] opacity-80 ${
                     msg.userId === currentUser.id ? 'text-cyan-400' : 'text-slate-400'
                   }`}>
                     {msg.userName}
                   </span>
                   <span className="text-[8px] opacity-40 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
               </div>
               <div className="flex flex-col gap-1">
                 <p className="text-sm text-slate-100 leading-snug whitespace-pre-wrap break-words">
                    {msg.emoji && <span className="mr-2 text-lg leading-none align-middle">{msg.emoji}</span>}
                    {msg.text}
                 </p>
               </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input de Control Inferior */}
      <div className="shrink-0 p-4 bg-slate-900/90 backdrop-blur-md border-t border-white/5">
        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
            {MICROMOBILITY_CHAT_EMOJIS.map(item => (
                <button
                    key={item.emoji}
                    onClick={() => setSelectedEmoji(item.emoji === selectedEmoji ? null : item.emoji)}
                    className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-xl text-lg transition-all ${
                        selectedEmoji === item.emoji 
                        ? 'bg-cyan-500/20 text-white ring-2 ring-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]' 
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                    title={item.description}
                >
                    {item.emoji}
                </button>
            ))}
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex-grow relative">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                    placeholder={selectedEmoji ? `Enviando ${selectedEmoji}...` : "Escribe intel aquí..."}
                    className="w-full bg-black/50 border border-white/10 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder-slate-600 transition-all outline-none"
                    disabled={isSending}
                />
            </div>
            <button
                onClick={handleSendMessage}
                disabled={isSending || (!newMessage.trim() && !selectedEmoji)}
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 active:scale-90 transition-all disabled:opacity-20 disabled:grayscale"
            >
                {isSending ? <i className="fas fa-spinner fa-spin text-sm"></i> : <i className="fas fa-paper-plane text-sm"></i>}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MicromobilityChatWindow;
