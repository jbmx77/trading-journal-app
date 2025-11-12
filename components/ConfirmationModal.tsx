import React from 'react';
import { AlertIcon } from './Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDismiss?: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  confirmButtonClassName?: string;
  dismissButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    onDismiss,
    title, 
    message,
    confirmButtonText = 'Confirm',
    confirmButtonClassName = 'bg-red hover:opacity-80',
    dismissButtonText
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-surface rounded-xl border border-border shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-start">
            <div className="mr-4 flex-shrink-0">
                <AlertIcon />
            </div>
            <div>
                <h2 className="text-xl font-bold mb-2 text-text_primary">{title}</h2>
                <p className="text-text_secondary mb-6">{message}</p>
            </div>
        </div>
        <div className="flex justify-end space-x-4">
          {onDismiss && dismissButtonText && (
            <button 
              type="button" 
              onClick={onDismiss}
              className="bg-secondary hover:bg-secondary_hover text-text_secondary font-bold py-2.5 px-5 rounded-lg transition-colors duration-200"
            >
              {dismissButtonText}
            </button>
          )}
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-5 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className={`text-white font-bold py-2.5 px-5 rounded-lg transition-colors duration-200 ${confirmButtonClassName}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;