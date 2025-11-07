// App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LiveSession, LiveServerMessage } from '@google/genai';
// FIX: Import LoaderCircle component from lucide-react.
import { LoaderCircle } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsModal } from './components/SettingsModal';
import { CameraView } from './components/CameraView';
import { RecordingModeModal } from './components/RecordingModeModal';
import { AddKnowledgeModal } from './components/AddKnowledgeModal';
import { ChatMessage, UserProfile, KnowledgeBase, KnowledgeCategory, KnowledgeItem } from './types';
import { connectToLiveSession, processAudioInput, generateText, extractKeyInfoFromConversation, extractKeyInfoFromText, extractKeyInfoFromUrl, analyzeKnowledgeForReminders } from './services/geminiService';
import { syncUserProfile, addKnowledgeItem, mergeAndSyncKnowledge, saveAndSyncProfile, updateAndSyncKnowledgeItem } from './services/syncService';
import { decode, decodeAudioData } from './utils/audioUtils';
import { extractTextFromPdf } from './utils/fileUtils';
import { getProfileFromDb } from './services/databaseService';
import { getFirestoreStatus } from './services/firebaseService';

const App: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isCameraViewOpen, setIsCameraViewOpen] = useState(false);
    const [isRecordingModeModalOpen, setIsRecordingModeModalOpen] = useState(false);
    const [isAddKnowledgeModalOpen, setIsAddKnowledgeModalOpen] = useState(false);
    const [isProcessingKnowledgeSource, setIsProcessingKnowledgeSource] = useState(false);
    const [currentTranscription, setCurrentTranscription] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [firestoreStatus, setFirestoreStatus] = useState(false);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const transcriptionAccumulatorRef = useRef('');
    
    // Using a ref for isAssistantSpeaking to get the latest value in audio playback callback
    const isAssistantSpeakingRef = useRef(isAssistantSpeaking);
    useEffect(() => {
        isAssistantSpeakingRef.current = isAssistantSpeaking;
    }, [isAssistantSpeaking]);


    const nextAudioStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const isRecordingRef = useRef(isRecording);
    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);
    
    const addMessage = useCallback((role: 'user' | 'model' | 'system', content: string, actions?: ChatMessage['actions']) => {
        setMessages(prev => [...prev, { id: uuidv4(), role, content, actions }]);
    }, []);

    useEffect(() => {
        // Load profile with cache-first strategy
        const loadProfile = async () => {
            const localProfile = await getProfileFromDb();
            if (localProfile) {
                setProfile(localProfile);
            }
            const syncedProfile = await syncUserProfile();
            setProfile(syncedProfile);
            
            const fsStatus = getFirestoreStatus();
            setFirestoreStatus(fsStatus);
            
            // Adiciona uma mensagem de status da conexão com a Memória de Longo Prazo
            setTimeout(() => {
                if (fsStatus) {
                    addMessage('system', '✅ Memória de Longo Prazo conectada. Suas configurações e aprendizados estão sendo salvos permanentemente.');
                } else {
                    addMessage('system', '⚠️ Falha ao conectar a Memória de Longo Prazo. O modo local está ativo. Verifique as credenciais do Firebase.');
                }
            }, 500);
        };
        loadProfile();

        const handleOnline = async () => {
            setIsOnline(true);
            addMessage('system', 'Conexão restabelecida. Sincronizando perfil...');
            const syncedProfile = await syncUserProfile();
            setProfile(syncedProfile);
            setFirestoreStatus(getFirestoreStatus());
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [addMessage]);
    
    const handleSendMessage = async (message: string) => {
        if (!profile) return;
        addMessage('user', message);
        setMessages(prev => [...prev, {id: uuidv4(), role: 'model', content: '', isTyping: true}]);
        try {
            const responseText = await generateText(message, profile);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.isTyping) {
                    lastMessage.content = responseText;
                    delete lastMessage.isTyping;
                }
                return newMessages;
            });
        } catch(error) {
            console.error("Error sending message:", error);
             setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.isTyping) {
                    lastMessage.content = "Desculpe, encontrei um erro.";
                    delete lastMessage.isTyping;
                }
                return newMessages;
            });
        }
    };
    
    const handleKnowledgeItemClick = (item: KnowledgeItem) => {
        const content = `**${item.title}**\n\n${item.content}`;
        addMessage('system', content);
        if (window.innerWidth < 768) { // md breakpoint
            setIsSidebarOpen(false);
        }
    };

    const handleReminderAction = useCallback(async (suggestionMessageId: string, itemId: string, accepted: boolean) => {
        if (!profile) return;
        
        // Remove the suggestion message with buttons from the chat
        setMessages(prev => prev.filter(msg => msg.id !== suggestionMessageId));

        // Update the knowledge item to prevent future suggestions for it
        const updatedProfile = await updateAndSyncKnowledgeItem(profile, itemId, { reminderSet: true });
        setProfile(updatedProfile);

        if (accepted) {
            addMessage('system', `Ótimo! Criei um lembrete para você e te avisarei quando for a hora.`);
        }
    }, [profile, addMessage]);


    const stopRecording = useCallback(async () => {
        if (!isRecordingRef.current) return;
        console.log("Stopping recording...");
        setIsRecording(false);
        setIsAssistantSpeaking(false);

        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (error) {
                console.error("Error closing live session:", error);
            } finally {
                sessionPromiseRef.current = null;
            }
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
             await outputAudioContextRef.current.close();
             outputAudioContextRef.current = null;
        }

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextAudioStartTimeRef.current = 0;
        setCurrentTranscription('');
        transcriptionAccumulatorRef.current = '';

        // ATIVAÇÃO DO APRENDIZADO CONTÍNUO
        let currentProfile = profile;
        if (currentProfile && messages.length > 0) {
            const conversationHistory = messages
                .filter(msg => (msg.role === 'user' || msg.role === 'model') && msg.content)
                .slice(-6) // Usa as últimas 6 mensagens para manter o contexto relevante
                .map(msg => `${msg.role === 'user' ? 'Usuário' : 'James'}: ${msg.content}`)
                .join('\n');

            if (conversationHistory.trim()) {
                addMessage('system', 'Analisando conversa para aprendizado...');
                
                try {
                    const newKnowledge = await extractKeyInfoFromConversation(conversationHistory);

                    setMessages(prev => prev.filter(m => m.content !== 'Analisando conversa para aprendizado...'));
                    
                    if (newKnowledge) {
                        const addedItems = (Object.values(newKnowledge) as KnowledgeItem[][]).flat();
                        if (addedItems.length > 0) {
                            const updatedProfile = await mergeAndSyncKnowledge(currentProfile, newKnowledge);
                            setProfile(updatedProfile);
                            currentProfile = updatedProfile; // Update profile for next step
                            addMessage('system', `James aprendeu ${addedItems.length} nova(s) informação(ões) e as adicionou à sua memória.`);
                        }
                    }
                } catch (error) {
                    console.error("Failed to analyze conversation:", error);
                    setMessages(prev => prev.filter(m => m.content !== 'Analisando conversa para aprendizado...'));
                    addMessage('system', 'Ocorreu um erro ao tentar aprender com a conversa.');
                }
            }
        }

        // ANÁLISE PROATIVA DE LEMBRETES
        if (currentProfile) {
            try {
                const reminderSuggestions = await analyzeKnowledgeForReminders(currentProfile.knowledgeBase);
                if (reminderSuggestions && reminderSuggestions.length > 0) {
                    addMessage('system', 'Com base em suas metas, notei algumas coisas sobre as quais posso te lembrar. O que acha?');

                    reminderSuggestions.forEach(suggestion => {
                        const messageId = uuidv4();
                        const actions = [
                            {
                                text: 'Sim, criar lembrete',
                                onClick: () => handleReminderAction(messageId, suggestion.itemId, true)
                            },
                            {
                                text: 'Não, obrigado',
                                onClick: () => handleReminderAction(messageId, suggestion.itemId, false)
                            }
                        ];
                        // Add message with actions directly
                        setMessages(prev => [...prev, { id: messageId, role: 'system', content: `"${suggestion.suggestionText}"`, actions }]);
                    });
                }
            } catch (error) {
                console.error("Failed to analyze for reminders:", error);
            }
        }
    }, [profile, messages, addMessage, handleReminderAction]);


    const processAssistantAudio = useCallback(async (base64Audio: string) => {
        if (!outputAudioContextRef.current) return;

        setIsAssistantSpeaking(true);
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            outputAudioContextRef.current,
            24000,
            1
        );
        
        const source = outputAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        
        const outputNode = outputAudioContextRef.current.createGain();
        source.connect(outputNode);
        outputNode.connect(outputAudioContextRef.current.destination);

        source.onended = () => {
            audioSourcesRef.current.delete(source);
            if (audioSourcesRef.current.size === 0) {
                 setIsAssistantSpeaking(false);
            }
        };

        const startTime = Math.max(nextAudioStartTimeRef.current, outputAudioContextRef.current.currentTime);
        source.start(startTime);
        nextAudioStartTimeRef.current = startTime + audioBuffer.duration;
        audioSourcesRef.current.add(source);

    }, []);

    const startRecording = async (enableTranscription = true) => {
        if (isRecording || !profile) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
        } catch (error) {
            console.error("Microphone access denied:", error);
            addMessage('system', 'O acesso ao microfone foi negado. Por favor, habilite-o nas configurações do seu navegador.');
            return;
        }

        setIsRecording(true);
        addMessage('system', 'Conversa iniciada...');
        transcriptionAccumulatorRef.current = '';

        // FIX: Cast window to `any` to allow access to vendor-prefixed webkitAudioContext for broader browser support.
        inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // FIX: Cast window to `any` to allow access to vendor-prefixed webkitAudioContext for broader browser support.
        outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextAudioStartTimeRef.current = outputAudioContextRef.current.currentTime;

        sessionPromiseRef.current = connectToLiveSession({
            onopen: () => {
                console.log("Live session opened.");
                if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
                
                mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

                scriptProcessorRef.current.onaudioprocess = (event) => {
                    if (isRecordingRef.current && !isAssistantSpeakingRef.current) {
                        const inputData = event.inputBuffer.getChannelData(0);
                         if (sessionPromiseRef.current) {
                            processAudioInput(sessionPromiseRef.current, inputData);
                        }
                    }
                };
                
                mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                try {
                    if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                        const audioData = message.serverContent.modelTurn.parts[0].inlineData.data;
                        await processAssistantAudio(audioData);
                    }
                    if (enableTranscription && message.serverContent?.inputTranscription) {
                        const newTranscription = message.serverContent.inputTranscription.text;
                        setCurrentTranscription(newTranscription);
                        transcriptionAccumulatorRef.current = newTranscription;
                    }
                    if (message.serverContent?.turnComplete) {
                         if (transcriptionAccumulatorRef.current) {
                            addMessage('user', transcriptionAccumulatorRef.current);
                         }
                         setCurrentTranscription('');
                         transcriptionAccumulatorRef.current = '';
                    }
                } catch(error) {
                     console.error("Erro ao processar a mensagem do servidor:", error);
                    addMessage('system', 'Ocorreu um erro ao processar a resposta. A sessão foi encerrada para evitar instabilidade.');
                    stopRecording();
                }
            },
            onerror: (event: ErrorEvent) => {
                console.error('Live session error:', event);
                addMessage('system', 'Não foi possível conectar. Verifique sua conexão com a internet. Se o problema persistir, pode haver um problema com a configuração do serviço.');
                stopRecording();
            },
            onclose: (event: CloseEvent) => {
                console.log("Live session closed.", event);
                stopRecording();
            },
        }, profile, enableTranscription);
    };

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            // Check for microphone permission status
            navigator.permissions.query({ name: 'microphone' as PermissionName }).then(permissionStatus => {
                if (permissionStatus.state === 'denied') {
                    addMessage('system', 'O acesso ao microfone foi bloqueado. Por favor, altere a permissão nas configurações do seu navegador e recarregue a página.');
                } else {
                    startRecording(true);
                }
            });
        }
    };

    const handleStartMeeting = (mode: 'listen' | 'participate') => {
        setIsRecordingModeModalOpen(false);
        const enableTranscription = true; // Always on for meetings
        startRecording(enableTranscription);
        if(mode === 'listen'){
             addMessage('system', 'James está ouvindo a reunião...');
        } else {
             addMessage('system', 'James está participando da reunião...');
        }
    };
    
    const handleSaveSettings = async (newProfile: UserProfile) => {
        await saveAndSyncProfile(newProfile);
        setProfile(newProfile);
        addMessage('system', 'Configurações salvas e sincronizadas.');
    };
    
    const handleSaveKnowledge = async (category: KnowledgeCategory, item: Omit<KnowledgeItem, 'id'>) => {
        if (profile) {
            const updatedProfile = await addKnowledgeItem(profile, category, item);
            setProfile(updatedProfile);
            addMessage('system', `Nova informação adicionada à memória na categoria '${category}'.`);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!profile || isProcessingKnowledgeSource) return;

        setIsProcessingKnowledgeSource(true);
        addMessage('system', `Analisando o arquivo: ${file.name}...`);
        
        try {
            const text = await extractTextFromPdf(file);
            if (!text || !text.trim()) {
                throw new Error("Não foi possível extrair conteúdo do PDF.");
            }

            const newKnowledge = await extractKeyInfoFromText(text);

            if (newKnowledge) {
                const addedItems = (Object.values(newKnowledge) as KnowledgeItem[][]).flat();
                if (addedItems.length > 0) {
                    const updatedProfile = await mergeAndSyncKnowledge(profile, newKnowledge);
                    setProfile(updatedProfile);
                    addMessage('system', `James aprendeu ${addedItems.length} nova(s) informação(ões) do documento '${file.name}'.`);
                } else {
                    addMessage('system', `Nenhuma nova informação relevante foi encontrada em '${file.name}'.`);
                }
            }
        } catch (error) {
            console.error("Falha ao processar o arquivo PDF:", error);
            addMessage('system', 'Ocorreu um erro ao analisar o documento. Tente novamente.');
        } finally {
            setIsProcessingKnowledgeSource(false);
            setIsAddKnowledgeModalOpen(false);
        }
    };

    const handleUrlSubmit = async (url: string) => {
        if (!profile || isProcessingKnowledgeSource) return;

        setIsProcessingKnowledgeSource(true);
        addMessage('system', `Analisando o link: ${url}...`);

        try {
            const newKnowledge = await extractKeyInfoFromUrl(url);

             if (newKnowledge) {
                const addedItems = (Object.values(newKnowledge) as KnowledgeItem[][]).flat();
                if (addedItems.length > 0) {
                    const updatedProfile = await mergeAndSyncKnowledge(profile, newKnowledge);
                    setProfile(updatedProfile);
                    addMessage('system', `James aprendeu ${addedItems.length} nova(s) informação(ões) do link.`);
                } else {
                    addMessage('system', `Não foi possível extrair informações relevantes do link fornecido.`);
                }
            }
        } catch (error) {
            console.error("Falha ao processar o URL:", error);
            addMessage('system', 'Ocorreu um erro ao analisar o link. Tente novamente.');
        } finally {
            setIsProcessingKnowledgeSource(false);
            setIsAddKnowledgeModalOpen(false);
        }
    };

    if (!profile) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-bg-dark">
                <div className="flex items-center space-x-2 text-text-secondary">
                    <LoaderCircle className="animate-spin" size={24} />
                    <span>Carregando perfil de James...</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex h-screen w-screen bg-bg-dark text-text-primary">
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                knowledgeBase={profile.knowledgeBase}
                onAddKnowledge={() => setIsAddKnowledgeModalOpen(true)}
                onKnowledgeItemClick={handleKnowledgeItemClick}
            />
            <ChatView
                messages={messages}
                isRecording={isRecording}
                isAssistantSpeaking={isAssistantSpeaking}
                transcription={currentTranscription}
                isOnline={isOnline}
                firestoreStatus={firestoreStatus}
                onMicClick={handleMicClick}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onStartMeeting={() => setIsRecordingModeModalOpen(true)}
                onOpenCamera={() => setIsCameraViewOpen(true)}
            />
            <SettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                onSave={handleSaveSettings}
                currentProfile={profile}
            />
            <RecordingModeModal 
                isOpen={isRecordingModeModalOpen}
                onClose={() => setIsRecordingModeModalOpen(false)}
                onStart={handleStartMeeting}
            />
            <AddKnowledgeModal
                isOpen={isAddKnowledgeModalOpen}
                onClose={() => setIsAddKnowledgeModalOpen(false)}
                onSave={handleSaveKnowledge}
                isProcessing={isProcessingKnowledgeSource}
                onFileUpload={handleFileUpload}
                onUrlSubmit={handleUrlSubmit}
            />
             {isCameraViewOpen && sessionPromiseRef.current && (
                <CameraView 
                    onClose={() => setIsCameraViewOpen(false)} 
                    sessionPromise={sessionPromiseRef.current}
                />
            )}
        </div>
    );
};

export default App;