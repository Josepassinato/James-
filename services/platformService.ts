// services/platformService.ts

/**
 * Este serviço abstrai funcionalidades específicas da plataforma.
 */

interface NativeBridge {
    geminiNano: {
        isAvailable: () => Promise<boolean>;
        prompt: (prompt: string) => Promise<string | null>;
    };
    // Outros módulos nativos podem ser adicionados aqui
}

// Em um ambiente React Native, o objeto __bridge seria injetado no window.
declare global {
    interface Window {
        __bridge?: NativeBridge;
    }
}

/**
 * Indica se o código está rodando em um ambiente nativo (ex: React Native).
 * A verificação é feita pela existência da ponte nativa.
 */
export const isNative = (): boolean => {
    return window.__bridge !== undefined && window.__bridge.geminiNano !== undefined;
};

/**
 * Acessa a ponte nativa de forma segura.
 */
export const getNativeBridge = (): NativeBridge | null => {
    return isNative() ? window.__bridge! : null;
};
