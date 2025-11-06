// components/ChatView.tsx
import React from 'react';
import { Menu, Mic, LoaderCircle, CircleStop, Settings, Wifi, WifiOff, Video, CloudOff, Camera } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatViewProps {
  messages: ChatMessage[];
  isRecording: boolean;
  isAssistantSpeaking: boolean;
  transcription: string;
  isOnline: boolean;
  firestoreStatus: boolean;
  onMicClick: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onStartMeeting: () => void;
  onOpenCamera: () => void;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isModel = message.role === 'model';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-sm text-center text-text-secondary bg-bg-lighter px-4 py-3 rounded-lg max-w-md shadow-md">
          <p className="italic">{message.content}</p>
          {message.actions && (
            <div className="mt-3 flex justify-center items-center space-x-3">
              {message.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full bg-brand-primary text-white hover:bg-brand-primary-dark transition-transform transform hover:scale-105"
                >
                  {action.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isModel ? 'justify-start' : 'justify-end'} mb-4`}>
      <div 
        className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl ${
          isModel 
            ? 'bg-bg-lighter text-text-primary rounded-bl-none' 
            : 'bg-brand-primary text-white rounded-br-none'
        }`}
      >
        {message.isTyping ? (
          <div className="flex items-center space-x-1">
            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isRecording,
  isAssistantSpeaking,
  transcription,
  isOnline,
  firestoreStatus,
  onMicClick,
  onToggleSidebar,
  onOpenSettings,
  onStartMeeting,
  onOpenCamera,
}) => {
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMicButtonClick = () => {
      onMicClick();
  };

  const getButtonState = () => {
    if (!isRecording) {
      return {
        icon: <Mic className="w-8 h-8" />,
        label: 'Iniciar Conversa',
        style: 'bg-brand-primary hover:bg-brand-primary-dark text-white',
      };
    }
    if (isAssistantSpeaking) {
      return {
        icon: <LoaderCircle className="w-8 h-8 animate-spin" />,
        label: 'Assistente Falando',
        style: 'bg-bg-lighter text-text-secondary cursor-wait',
      };
    }
    return {
      icon: <CircleStop className="w-8 h-8" />,
      label: 'Parar Gravação',
      style: 'bg-red-500 text-white animate-pulse',
    };
  };

  const buttonState = getButtonState();

  return (
    <main className="flex-1 flex flex-col bg-bg-main">
      <header className="flex items-center justify-between p-4 border-b border-bg-lighter bg-bg-light md:bg-transparent">
        <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-bg-lighter md:hidden">
          <Menu size={24} />
        </button>
        <div className="flex items-center space-x-2">
           {isOnline ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-500" />}
           {!firestoreStatus && (
              <div title="Memória de longo prazo (Firestore) desconectada. Configure suas credenciais em services/firebaseService.ts">
                  <CloudOff size={16} className="text-yellow-500" />
              </div>
            )}
           <h1 className="text-lg sm:text-xl font-semibold text-text-primary">James Assistant</h1>
        </div>
        <div className="flex items-center space-x-1">
            <button onClick={onOpenSettings} className="p-2 rounded-full hover:bg-bg-lighter" aria-label="Configurações">
                <Settings size={20} />
            </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
          {transcription && (
            <div className="text-right text-gray-400 italic pr-2">
              {transcription}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
      
      <div className="p-4 md:p-6 bg-bg-light border-t border-bg-lighter">
        <div className="max-w-4xl mx-auto flex items-center justify-center space-x-4 sm:space-x-6">
           <button
              onClick={onStartMeeting}
              disabled={isRecording}
              aria-label="Gravar Reunião"
              title="Gravar Reunião"
              className="w-14 h-14 rounded-full flex items-center justify-center bg-bg-lighter text-text-secondary hover:bg-bg-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <Video className="w-6 h-6" />
           </button>
           <button
            onClick={handleMicButtonClick}
            disabled={!isOnline || (isRecording && isAssistantSpeaking)}
            aria-label={buttonState.label}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${buttonState.style}`}
          >
            {buttonState.icon}
          </button>
          <button
              onClick={onOpenCamera}
              disabled={!isRecording}
              aria-label="Abrir Câmera"
              title={!isRecording ? "Inicie uma conversa para usar a câmera" : "Abrir Câmera"}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-bg-lighter text-text-secondary hover:bg-bg-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <Camera className="w-6 h-6" />
          </button>
        </div>
      </div>
    </main>
  );
};