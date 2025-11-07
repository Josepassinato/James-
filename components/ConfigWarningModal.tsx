// components/ConfigWarningModal.tsx
import React from 'react';
import { Database, AlertTriangle, Settings } from 'lucide-react';

interface ConfigWarningModalProps {
  onDismiss: () => void;
  onOpenSettings: () => void;
}

export const ConfigWarningModal: React.FC<ConfigWarningModalProps> = ({ onDismiss, onOpenSettings }) => {
  
  const handleOpenSettings = () => {
      onOpenSettings();
      onDismiss(); // Fecha o modal de aviso ao abrir as configurações
  };

  return (
    <div className="fixed inset-0 bg-bg-dark z-50 flex items-center justify-center p-4">
      <div className="bg-bg-light rounded-lg shadow-2xl w-full max-w-lg p-8 border border-bg-lighter">
        <div className="flex flex-col items-center text-center">
            <Database size={40} className="text-brand-primary mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">
                Conecte sua Memória de Longo Prazo
            </h2>
            <p className="text-text-secondary mb-6 max-w-lg">
                Para garantir que as configurações e aprendizados de James sejam salvos permanentemente e sincronizados entre dispositivos (como do preview para o deploy), é necessário conectar ao Firestore.
            </p>

            <div className="bg-bg-main p-4 rounded-md text-left w-full mb-6">
                <h3 className="font-semibold text-text-primary mb-2">Ação Necessária:</h3>
                <p className="text-sm text-text-secondary">
                    Para habilitar o salvamento permanente, você precisa configurar suas credenciais do Firebase no seguinte arquivo do seu projeto:
                </p>
                <code className="block bg-bg-dark text-brand-secondary p-2 rounded-md mt-2 text-sm">
                    services/firebaseService.ts
                </code>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 w-full">
                <button
                    onClick={onDismiss}
                    className="w-full px-6 py-3 rounded-md bg-bg-lighter text-text-secondary font-semibold hover:bg-bg-main transition-colors"
                >
                    <div className="flex items-center justify-center">
                        <AlertTriangle size={16} className="mr-2 text-yellow-500" />
                        <span>Continuar (Modo Local)</span>
                    </div>
                </button>
                 <button
                    onClick={handleOpenSettings}
                    className="w-full px-6 py-3 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-dark transition-colors"
                >
                    <div className="flex items-center justify-center">
                        <Settings size={16} className="mr-2" />
                        <span>Abrir Configurações</span>
                    </div>
                </button>
            </div>
             <p className="text-xs text-text-secondary mt-4 text-center px-4">
                No modo local, suas configurações e aprendizados <b>não serão salvos permanentemente</b> e podem ser perdidos ao fechar ou recarregar a página.
            </p>
        </div>
      </div>
    </div>
  );
};