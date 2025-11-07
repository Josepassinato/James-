// components/SettingsModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Globe, Glasses, WifiOff, Database, LoaderCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { UserProfile, Integrations } from '../types';
import { testFirebaseConnection } from '../services/firebaseService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    currentProfile: UserProfile | null;
}

const voices = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const IntegrationToggle: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
}> = ({ icon: Icon, title, description, isEnabled, onToggle }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0">
      <Icon className={`h-6 w-6 ${isEnabled ? 'text-brand-secondary' : 'text-gray-500'}`} />
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-text-primary">{title}</h4>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
    <div className="flex-shrink-0">
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isEnabled ? 'bg-brand-primary' : 'bg-bg-main'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentProfile }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        if (currentProfile) {
            setProfile(JSON.parse(JSON.stringify(currentProfile))); // Deep copy
        }
        // Reset test status when modal is opened/closed
        setTestStatus('idle');
        setTestMessage('');
    }, [currentProfile, isOpen]);

    if (!isOpen || !profile) {
        return null;
    }

    const handleSave = () => {
        onSave(profile);
        onClose();
    };
    
    const handleIntegrationChange = (key: keyof Integrations) => {
        setProfile(prev => prev ? ({
            ...prev,
            integrations: {
                ...prev.integrations,
                [key]: !prev.integrations[key]
            }
        }) : null);
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        const result = await testFirebaseConnection();
        setTestMessage(result.message);
        setTestStatus(result.success ? 'success' : 'error');

        // Reset after 5 seconds
        setTimeout(() => {
            setTestStatus('idle');
            setTestMessage('');
        }, 5000);
    };

    const TestStatusIndicator = () => {
        if (testStatus === 'idle' || testStatus === 'testing') return null;

        const isSuccess = testStatus === 'success';
        const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
        const color = isSuccess ? 'text-green-500' : 'text-red-500';

        return (
            <div className={`flex items-center space-x-2 text-sm mt-3 ${color}`}>
                <Icon size={16} />
                <span>{testMessage}</span>
            </div>
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-bg-light rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 border-b border-bg-lighter">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-lighter transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-text-primary">Configurações</h2>
                </div>

                <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Personalidade</h3>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="systemInstruction" className="block text-sm font-medium text-text-secondary mb-2">
                                    Instrução do Sistema
                                </label>
                                <textarea
                                    id="systemInstruction"
                                    rows={4}
                                    className="w-full p-3 bg-bg-main border border-bg-lighter rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                                    value={profile.systemInstruction}
                                    onChange={(e) => setProfile({ ...profile, systemInstruction: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="voiceName" className="block text-sm font-medium text-text-secondary mb-2">
                                    Voz do Assistente
                                </label>
                                <select
                                    id="voiceName"
                                    className="w-full p-3 bg-bg-main border border-bg-lighter rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                                    value={profile.voiceName}
                                    onChange={(e) => setProfile({ ...profile, voiceName: e.target.value as UserProfile['voiceName'] })}
                                >
                                    {voices.map(voice => (
                                        <option key={voice} value={voice}>{voice}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Integrações e Proatividade</h3>
                        <div className="space-y-6">
                           <IntegrationToggle 
                                icon={Globe}
                                title="Geolocalização"
                                description="Permite sugestões proativas sobre trânsito e locais."
                                isEnabled={profile.integrations.geolocation}
                                onToggle={() => handleIntegrationChange('geolocation')}
                           />
                           <IntegrationToggle 
                                icon={Glasses}
                                title="Modo Smart Glasses"
                                description="Otimiza a interação para óculos inteligentes (Em breve)."
                                isEnabled={profile.integrations.smartGlasses}
                                onToggle={() => handleIntegrationChange('smartGlasses')}
                           />
                           <IntegrationToggle 
                                icon={WifiOff}
                                title="Funcionalidade Offline"
                                description="Permite o uso de funções básicas sem internet (Gemini Nano)."
                                isEnabled={profile.integrations.offlineMode}
                                onToggle={() => handleIntegrationChange('offlineMode')}
                           />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Conectividade e Memória</h3>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <Database className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-text-primary">Memória de Longo Prazo (Firestore)</h4>
                                <p className="text-sm text-text-secondary">Verifique se o aplicativo está conectado corretamente ao Firebase para salvar e sincronizar seus dados.</p>
                                <div className="mt-4">
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={testStatus === 'testing'}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-bg-main text-text-primary hover:bg-bg-lighter border border-bg-lighter transition-colors disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {testStatus === 'testing' && <LoaderCircle size={16} className="animate-spin mr-2" />}
                                        {testStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
                                    </button>
                                    <TestStatusIndicator />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-6 mt-auto border-t border-bg-lighter flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md text-text-secondary hover:bg-bg-lighter transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-dark transition"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};