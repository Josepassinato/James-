// services/firebaseService.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Firestore, Timestamp } from 'firebase/firestore';
import { UserProfile } from '../types';

// --- CONFIGURAÇÃO PERMANENTE DA MEMÓRIA DE LONGO PRAZO ---
// As credenciais do seu projeto Firebase estão configuradas abaixo.
// Este é o local final e seguro para esta configuração.
// Não modifique estes valores a menos que você mude de projeto no Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBVhd93Chs7Pqo1wC-buSeCQInWObANTU0",
  authDomain: "iron-man-projec.firebaseapp.com",
  projectId: "iron-man-projec",
  storageBucket: "iron-man-projec.appspot.com",
  messagingSenderId: "391989800596",
  appId: "1:391989800596:web:bf29a0d565521fd5db4e81",
};

let db: Firestore | null = null;
let isFirestoreInitialized = false;

// Inicializa o Firebase, pois as credenciais foram fornecidas.
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isFirestoreInitialized = true;
  console.log("Conexão com Firebase (Memória de Longo Prazo) estabelecida com sucesso.");
} catch (error) {
  console.error("Falha na inicialização do Firebase. Verifique suas credenciais em 'services/firebaseService.ts'. Erro:", error);
  // A variável 'db' permanecerá nula, e os recursos do Firestore serão desativados.
}

/**
 * Retorna o status de inicialização do Firestore.
 * @returns {boolean} True se o Firestore foi inicializado com sucesso.
 */
export const getFirestoreStatus = (): boolean => isFirestoreInitialized;

// Usa um ID de usuário estático, pois não há sistema de autenticação
const USER_ID = 'default-user'; 

/**
 * Busca o perfil do usuário no Firestore (Memória de Longo Prazo).
 * @returns Uma promessa que resolve para o objeto UserProfile ou nulo se não for encontrado ou se o Firebase não estiver inicializado.
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
    if (!db) {
        console.log("Firestore não está inicializado. Pulando a busca de perfil na nuvem.");
        return null;
    }
    try {
        const userDocRef = doc(db, 'users', USER_ID);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        } else {
            console.log("Nenhum documento de perfil de usuário encontrado na nuvem, um novo será criado.");
            return null;
        }
    } catch (error) {
        console.error("Erro ao obter o perfil do usuário do Firestore:", error);
        return null;
    }
};

/**
 * Salva ou substitui completamente o perfil do usuário no Firestore (Memória de Longo Prazo).
 * @param profileData - O objeto UserProfile completo para salvar.
 * @returns Uma promessa que resolve quando a atualização estiver completa ou se o Firebase não estiver inicializado.
 */
export const updateUserProfile = async (profileData: UserProfile): Promise<void> => {
    if (!db) {
        console.log("Firestore não está inicializado. Pulando a atualização de perfil na nuvem.");
        return;
    }
    try {
        const userDocRef = doc(db, 'users', USER_ID);
        // Usa set sem merge para garantir que o objeto enviado seja a fonte da verdade,
        // pois a lógica de mesclagem agora está no syncService.
        await setDoc(userDocRef, profileData);
        console.log("Perfil do usuário salvo com sucesso no Firestore.");
    } catch (error) {
        console.error("Erro ao salvar o perfil do usuário no Firestore:", error);
    }
};

/**
 * Tenta uma operação de escrita e leitura no Firestore para verificar a conexão.
 * @returns Um objeto indicando o sucesso da operação e uma mensagem.
 */
export const testFirebaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!db) {
        return { success: false, message: "Falha: O Firebase não foi inicializado. Verifique as credenciais no código." };
    }
    try {
        const testDocRef = doc(db, 'status', 'connection-test');
        // Escreve um timestamp no documento
        await setDoc(testDocRef, { timestamp: Timestamp.now() });
        // Lê o documento de volta para confirmar a escrita
        const docSnap = await getDoc(testDocRef);
        if (docSnap.exists()) {
            console.log("Teste de conexão com o Firebase bem-sucedido.");
            return { success: true, message: "Conexão com o Firebase estabelecida com sucesso!" };
        } else {
            throw new Error("O documento de teste não foi encontrado após a escrita.");
        }
    } catch (error: any) {
        console.error("Erro no teste de conexão com o Firebase:", error);
        let errorMessage = "Falha na conexão. Verifique o console para detalhes.";
        if (error.code === 'permission-denied') {
            errorMessage = "Falha: Permissão negada. Verifique as regras de segurança do seu Firestore.";
        } else if (error.code === 'unauthenticated' || (error.message && error.message.includes('API key'))) {
             errorMessage = "Falha: Autenticação inválida. Verifique sua chave de API e outras credenciais.";
        }
        return { success: false, message: errorMessage };
    }
};