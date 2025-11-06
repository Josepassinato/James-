// services/geminiNanoService.ts
import { isNative, getNativeBridge } from './nativeBridge';

declare global {
    interface Window {
        ai?: {
            canCreateTextSession: () => Promise<'readily' | 'after-download' | 'no'>;
            createTextSession: () => Promise<AITextSession>;
        };
    }

    interface AITextSession {
        prompt: (prompt: string) => Promise<string>;
        destroy: () => void;
    }
}

let webAiSession: AITextSession | null = null;

export const isGeminiNanoAvailable = async (): Promise<boolean> => {
    if (isNative()) {
        return getNativeBridge()?.geminiNano.isAvailable() ?? Promise.resolve(false);
    }
    if (window.ai && 'canCreateTextSession' in window.ai) {
        try {
            const state = await window.ai.canCreateTextSession();
            return state === 'readily';
        } catch (e) {
            console.error("Error checking web AI availability:", e);
            return false;
        }
    }
    return false;
};

export const generateTextWithNano = async (prompt: string): Promise<string | null> => {
    // Prioriza a implementação nativa
    if (isNative()) {
        try {
             return await getNativeBridge()!.geminiNano.prompt(prompt);
        } catch (e) {
            console.error("Error generating text with native Gemini Nano:", e);
            return null;
        }
    }

    // Fallback para a implementação web
    if (window.ai) {
        try {
            if (!webAiSession) {
                webAiSession = await window.ai.createTextSession();
            }
            return await webAiSession.prompt(prompt);
        } catch (e) {
            console.error("Error generating text with web Gemini Nano:", e);
            destroyNanoSession(); // Limpa a sessão em caso de erro
            return null;
        }
    }
    
    console.error("Gemini Nano is not supported in this environment.");
    return null;
};

export const destroyNanoSession = () => {
    if (webAiSession) {
        webAiSession.destroy();
        webAiSession = null;
    }
    // A destruição da sessão nativa seria gerenciada pelo próprio código nativo.
};
