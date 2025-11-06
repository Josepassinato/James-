// services/nativeBridge.ts

/**
 * Este arquivo define a ponte de comunicação entre o código JavaScript (React)
 * e o código nativo (Swift/Kotlin) em um ambiente React Native.
 * Ele serve como um contrato de como as duas partes irão interagir.
 */

// 1. Definição da Interface da Ponte
// ------------------------------------
// Aqui, definimos a "forma" dos módulos nativos que queremos expor ao JavaScript.
interface NativeBridge {
    geminiNano: {
        /**
         * Verifica se o motor do Gemini Nano está disponível e pronto para uso no dispositivo.
         * @returns {Promise<boolean>} True se estiver pronto, false caso contrário.
         */
        isAvailable: () => Promise<boolean>;
        /**
         * Envia um prompt para o modelo Gemini Nano local e retorna a resposta.
         * @param {string} prompt O texto de entrada para o modelo.
         * @returns {Promise<string | null>} A resposta gerada ou nulo em caso de erro.
         */
        prompt: (prompt: string) => Promise<string | null>;
    };
    // Futuramente, poderíamos adicionar outros módulos nativos, como:
    // calendar: { ... }
    // contacts: { ... }
}

// 2. Declaração Global
// --------------------
// Estendemos o objeto `window` para que o TypeScript saiba da possível
// existência da nossa ponte. Em um aplicativo React Native, o "runtime"
// injetaria o objeto `__bridge` no contexto global.
declare global {
    interface Window {
        __bridge?: NativeBridge;
    }
}

// 3. Funções de Acesso Seguro
// ---------------------------
/**
 * Verifica de forma segura se estamos rodando em um ambiente nativo.
 * A verificação se baseia na existência do objeto `__bridge` injetado.
 * @returns {boolean} True se a ponte nativa estiver presente.
 */
export const isNative = (): boolean => {
    return window.__bridge !== undefined && window.__bridge.geminiNano !== undefined;
};

/**
 * Fornece acesso seguro ao objeto da ponte nativa.
 * @returns {NativeBridge | null} O objeto da ponte se estiver disponível, caso contrário nulo.
 */
export const getNativeBridge = (): NativeBridge | null => {
    return isNative() ? window.__bridge! : null;
};

// 4. Simulação para Desenvolvimento Web
// -------------------------------------
// Para permitir o desenvolvimento e teste na web sem quebrar o aplicativo,
// podemos simular a ponte se ela não existir.
if (process.env.NODE_ENV === 'development' && !isNative()) {
    console.log("Simulando Ponte Nativa para desenvolvimento web.");
    window.__bridge = {
        geminiNano: {
            isAvailable: async () => {
                console.log("[Simulação Nativa] Verificando disponibilidade do Nano.");
                return Promise.resolve(false); // Simula como não disponível na web
            },
            prompt: async (prompt: string) => {
                console.log(`[Simulação Nativa] Recebido prompt: ${prompt}`);
                return Promise.resolve(`[Resposta Simulada Nativa] Esta é uma resposta do motor nativo simulado.`);
            },
        },
    };
}
