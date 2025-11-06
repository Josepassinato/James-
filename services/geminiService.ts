// services/geminiService.ts
import {
    GoogleGenAI,
    LiveSession,
    LiveServerMessage,
    Modality,
    Type,
} from '@google/genai';
import { createBlob } from '../utils/audioUtils';
import { UserProfile, KnowledgeBase, KnowledgeItem, KnowledgeCategory } from '../types';

let ai: GoogleGenAI;

const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            console.error("API_KEY environment variable not set. Please set it.");
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

/**
 * Obtém a localização atual do usuário usando a API de geolocalização do navegador.
 * @returns Uma promessa que resolve para as coordenadas ou nulo se não for possível obter.
 */
const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by this browser.");
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                console.warn(`Geolocation error: ${error.message}`);
                resolve(null); // Resolve com nulo em caso de erro (ex: permissão negada)
            }
        );
    });
};

const formatKnowledgeBaseForPrompt = (knowledgeBase: KnowledgeBase): string => {
    let context = "INÍCIO DA BASE DE CONHECIMENTO DO USUÁRIO\n\n";
    let hasContent = false;
    
    const categoryNames: Record<KnowledgeCategory, string> = {
        personal: 'Pessoal',
        professional: 'Profissional',
        goals: 'Metas',
        misc: 'Diversos'
    };

    (Object.keys(categoryNames) as KnowledgeCategory[]).forEach(categoryKey => {
        const items = knowledgeBase[categoryKey];
        if (items && items.length > 0) {
            hasContent = true;
            context += `Categoria: ${categoryNames[categoryKey]}\n`;
            items.forEach(item => {
                context += `- Título: ${item.title}\n  Conteúdo: ${item.content}\n`;
            });
            context += "\n";
        }
    });

    if (!hasContent) {
        return ""; // Retorna string vazia se não houver conhecimento para não poluir o prompt
    }

    context += "FIM DA BASE DE CONHECIMENTO DO USUÁRIO\n\n";
    return context;
}

/**
 * Prepara a instrução do sistema com o contexto de tempo, localização e base de conhecimento do usuário.
 * @param profile O perfil completo do usuário.
 * @returns A instrução do sistema com data, hora, saudação, localização e conhecimento.
 */
const getDynamicSystemInstruction = async (profile: UserProfile): Promise<string> => {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; 

    // Forma mais robusta de obter a hora atual, evitando problemas de parsing de string.
    const hour = now.getHours();
    
    let greeting = "Boa noite";
    if (hour >= 5 && hour < 12) {
        greeting = "Bom dia";
    } else if (hour >= 12 && hour < 18) {
        greeting = "Boa tarde";
    }

    const timeString = now.toLocaleTimeString('pt-BR', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit'
    });
    const dateString = now.toLocaleDateString('pt-BR', {
        timeZone,
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    // Prompt de contexto de tempo mais direto e informativo para o modelo.
    const timeContext = `Contexto de tempo atual: ${dateString}, ${timeString}. Fuso horário do usuário: ${timeZone}. Saudação apropriada: ${greeting}.`;

    let locationContext: string;
    if (profile.integrations.geolocation) {
        const location = await getCurrentLocation();
        if (location) {
            locationContext = `Contexto de localização atual: O usuário está perto das coordenadas Latitude ${location.latitude.toFixed(4)}, Longitude ${location.longitude.toFixed(4)}.`;
        } else {
            locationContext = "Contexto de localização atual: A permissão de geolocalização pode ter sido negada ou o serviço não está disponível. A localização exata do usuário é desconhecida.";
        }
    } else {
        locationContext = "Contexto de localização atual: O recurso de geolocalização está desativado pelo usuário nas configurações.";
    }

    const knowledgeContext = formatKnowledgeBaseForPrompt(profile.knowledgeBase);

    return `${timeContext}\n${locationContext}\n\n${knowledgeContext}${profile.systemInstruction}`;
};


interface LiveSessionCallbacks {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (event: ErrorEvent) => void;
    onclose: (event: CloseEvent) => void;
}

export const connectToLiveSession = async (
    callbacks: LiveSessionCallbacks,
    profile: UserProfile,
    enableTranscription: boolean
): Promise<LiveSession> => {
    const ai = getAi();
    const systemInstruction = await getDynamicSystemInstruction(profile);
    
    const config: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: profile.voiceName || 'Zephyr' } },
        },
        systemInstruction,
    };

    if (enableTranscription) {
        config.outputAudioTranscription = {};
        config.inputAudioTranscription = {};
    }

    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config,
    });
};

export const processAudioInput = (sessionPromise: Promise<LiveSession>, audioData: Float32Array) => {
    const pcmBlob = createBlob(audioData);
    sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
    });
};

export const sendImageInput = async (sessionPromise: Promise<LiveSession>, base64Data: string) => {
    sessionPromise.then((session) => {
        session.sendRealtimeInput({
            media: { data: base64Data, mimeType: 'image/jpeg' }
        });
    });
};

export const generateText = async (prompt: string, profile: UserProfile) => {
    const ai = getAi();
    const dynamicSystemInstruction = await getDynamicSystemInstruction(profile);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: dynamicSystemInstruction,
        },
    });
    return response.text;
};

const knowledgeItemSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Um título conciso e descritivo para a informação." },
        content: { type: Type.STRING, description: "O conteúdo detalhado da informação." },
    },
    required: ['title', 'content']
};

const knowledgeBaseSchema = {
    type: Type.OBJECT,
    properties: {
        personal: { type: Type.ARRAY, description: "Informações sobre a vida pessoal do usuário (preferências, família, etc).", items: knowledgeItemSchema },
        professional: { type: Type.ARRAY, description: "Informações sobre a vida profissional do usuário (projetos, trabalho, etc).", items: knowledgeItemSchema },
        goals: { type: Type.ARRAY, description: "Metas e objetivos de curto ou longo prazo do usuário.", items: knowledgeItemSchema },
        misc: { type: Type.ARRAY, description: "Qualquer outra informação relevante que não se encaixe nas outras categorias.", items: knowledgeItemSchema },
    }
};

export const extractKeyInfoFromConversation = async (history: string): Promise<KnowledgeBase | null> => {
    const ai = getAi();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analise a seguinte conversa e extraia informações chave sobre o usuário, formatadas como itens de conhecimento com título e conteúdo. Inclua apenas informações novas ou atualizadas. Se nenhuma informação nova for encontrada, retorne um objeto JSON vazio. A informação deve ser sobre o usuário, não sobre o assistente. Conversa:\n\n${history}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: knowledgeBaseSchema
            }
        });

        const jsonString = response.text;
        if (!jsonString || !jsonString.trim()) return null;
        return JSON.parse(jsonString) as KnowledgeBase;
    } catch (error) {
        console.error("Error extracting key info from conversation:", error);
        return null;
    }
}

export const extractKeyInfoFromText = async (text: string): Promise<KnowledgeBase | null> => {
    const ai = getAi();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analise o seguinte texto extraído de um documento do usuário. Resuma as informações mais importantes em itens de conhecimento com título e conteúdo concisos. Categorize cada item em 'personal', 'professional', 'goals', ou 'misc'. Foque em informações que definem a pessoa, seus projetos, metas ou dados relevantes. Ignore informações triviais ou de formatação. Se nenhuma informação relevante for encontrada, retorne um objeto JSON vazio. Texto:\n\n${text}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: knowledgeBaseSchema
            }
        });

        const jsonString = response.text;
        if (!jsonString || !jsonString.trim()) return null;
        return JSON.parse(jsonString) as KnowledgeBase;
    } catch (error) {
        console.error("Error extracting key info from text:", error);
        return null;
    }
};

export const extractKeyInfoFromUrl = async (url: string): Promise<KnowledgeBase | null> => {
    const ai = getAi();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Você é um especialista em análise de conteúdo web. O usuário forneceu o seguinte URL: "${url}". Com base neste URL e em seu conhecimento geral sobre o conteúdo provável deste site (ou perfil de rede social), analise-o e extraia informações chave. 
            - Se for um site de notícias ou um blog, resuma os tópicos principais. 
            - Se for uma rede social (como LinkedIn, Twitter, Instagram), descreva o provável posicionamento profissional ou pessoal do usuário, seus interesses e o tipo de conteúdo que ele posta.
            - Estruture as informações como itens de conhecimento com título e conteúdo, categorizando cada um em 'personal', 'professional', 'goals', ou 'misc'. 
            Se o URL parecer inválido ou se você não puder fazer uma análise confiável, retorne um objeto JSON vazio.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: knowledgeBaseSchema
            }
        });

        const jsonString = response.text;
        if (!jsonString || !jsonString.trim()) return null;
        return JSON.parse(jsonString) as KnowledgeBase;
    } catch (error) {
        console.error("Error extracting key info from URL:", error);
        return null;
    }
};

const reminderSuggestionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            itemId: { type: Type.STRING, description: "O ID original do item de conhecimento." },
            suggestionText: { type: Type.STRING, description: "O texto conciso e amigável para a sugestão do lembrete." },
        },
        required: ['itemId', 'suggestionText']
    }
};

export interface ReminderSuggestion {
    itemId: string;
    suggestionText: string;
}

export const analyzeKnowledgeForReminders = async (knowledgeBase: KnowledgeBase): Promise<ReminderSuggestion[] | null> => {
    const ai = getAi();
    const actionableItems: KnowledgeItem[] = [];
    
    (['goals', 'professional'] as KnowledgeCategory[]).forEach(category => {
        knowledgeBase[category]?.forEach(item => {
            if (!item.reminderSet) {
                actionableItems.push(item);
            }
        });
    });

    if (actionableItems.length === 0) {
        return null;
    }

    const itemsForPrompt = actionableItems.map(item => `ID: ${item.id}, Título: ${item.title}, Conteúdo: ${item.content}`).join('\n');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analise os seguintes itens da base de conhecimento de um usuário. Identifique itens que representam metas ou tarefas com um prazo implícito ou explícito. Para cada item acionável, crie uma sugestão de lembrete amigável e curta. Retorne um array JSON com os resultados. Ignore itens que não são acionáveis. Itens:\n\n${itemsForPrompt}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: reminderSuggestionSchema,
            }
        });
        
        const jsonString = response.text;
        if (!jsonString || !jsonString.trim()) return null;

        const suggestions = JSON.parse(jsonString) as ReminderSuggestion[];
        return suggestions.length > 0 ? suggestions : null;

    } catch (error) {
        console.error("Error analyzing knowledge for reminders:", error);
        return null;
    }
}