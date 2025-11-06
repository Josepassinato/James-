import React from 'react';
import { X, Headphones, MessageSquarePlus } from 'lucide-react';

interface RecordingModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (mode: 'listen' | 'participate') => void;
}

export const RecordingModeModal: React.FC<RecordingModeModalProps> = ({ isOpen, onClose, onStart }) => {
    if (!isOpen) {
        return null;
    }

    const handleStart = (mode: 'listen' | 'participate') => {
        onStart(mode);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-bg-light rounded-lg shadow-2xl w-full max-w-md p-6 md:p-8 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-lighter transition-colors"
                >
                    <X size={20} />
                </button>
                
                <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">Iniciar Reunião</h2>
                <p className="text-center text-text-secondary mb-8">Como você quer que James participe?</p>
                
                <div className="space-y-4">
                    <button
                        onClick={() => handleStart('listen')}
                        className="w-full flex items-center text-left p-4 rounded-lg bg-bg-lighter hover:bg-bg-main border border-transparent hover:border-brand-secondary transition-all"
                    >
                        <Headphones size={40} className="text-brand-secondary mr-4 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-text-primary text-lg">Apenas Ouvir</h3>
                            <p className="text-text-secondary text-sm">
                                James irá transcrever a conversa e gerar resumos quando solicitado.
                            </p>
                        </div>
                    </button>
                    
                    <button
                        onClick={() => handleStart('participate')}
                        className="w-full flex items-center text-left p-4 rounded-lg bg-bg-lighter hover:bg-bg-main border border-transparent hover:border-brand-secondary transition-all"
                    >
                        <MessageSquarePlus size={40} className="text-brand-secondary mr-4 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-text-primary text-lg">Participar Ativamente</h3>
                            <p className="text-text-secondary text-sm">
                                James poderá pedir a palavra para contribuir com a discussão.
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
