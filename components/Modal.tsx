
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string; // Nueva propiedad opcional
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[5000] p-4">
      <div className={`ps-card w-full ${maxWidth} max-h-[95vh] flex flex-col p-6 transition-all duration-300`}>
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-2xl font-bold font-audiowide text-blue-300">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl transition-colors leading-none"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto pr-2 -mr-2 flex-grow scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
