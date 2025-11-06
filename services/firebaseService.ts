// services/firebaseService.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { UserProfile } from '../types';

// Lê as credenciais das variáveis de ambiente para maior segurança.
// O usuário deve criar um arquivo .env na raiz do projeto com esses valores.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

let db: Firestore | null = null;
let isFirestoreInitialized = false;

// Inicializa o Firebase apenas se as credenciais essenciais estiverem presentes.
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirestoreInitialized = true;
  } catch (error) {
    console.error("Falha na inicialização do Firebase:", error);
    // A variável 'db' permanecerá nula, e os recursos do Firestore serão desativados.
  }
} else {
  console.warn(
    "A configuração do Firebase está incompleta. Crie um arquivo '.env' na raiz do projeto e adicione suas credenciais do Firebase. As funcionalidades de memória de longo prazo (Firestore) estarão desabilitadas até que isso seja feito."
  );
}

/**
 * Retorna o status de inicialização do Firestore.
 * @returns {boolean} True se o Firestore foi inicializado com sucesso.
 */
export const getFirestoreStatus = (): boolean => isFirestoreInitialized;

// Usa um ID de usuário estático, pois não há sistema de autenticação
const USER_ID = 'default-user'; 

/**
 * Busca o perfil do usuário no Firestore.
 * @returns Uma promessa que resolve para o objeto UserProfile ou nulo se não for encontrado ou se o Firebase não estiver inicializado.
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
    if (!db) {
        console.log("Firestore não está inicializado. Pulando a busca de perfil.");
        return null;
    }
    try {
        const userDocRef = doc(db, 'users', USER_ID);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        } else {
            console.log("Nenhum documento de perfil de usuário encontrado, um novo será criado.");
            return null;
        }
    } catch (error) {
        console.error("Erro ao obter o perfil do usuário:", error);
        return null;
    }
};

/**
 * Salva ou substitui completamente o perfil do usuário no Firestore.
 * @param profileData - O objeto UserProfile completo para salvar.
 * @returns Uma promessa que resolve quando a atualização estiver completa ou se o Firebase não estiver inicializado.
 */
export const updateUserProfile = async (profileData: UserProfile): Promise<void> => {
    if (!db) {
        console.log("Firestore não está inicializado. Pulando a atualização de perfil.");
        return;
    }
    try {
        const userDocRef = doc(db, 'users', USER_ID);
        // Usa set sem merge para garantir que o objeto enviado seja a fonte da verdade,
        // pois a lógica de mesclagem agora está no syncService.
        await setDoc(userDocRef, profileData);
        console.log("Perfil do usuário salvo com sucesso no Firestore.");
    } catch (error) {
// FIX: Added curly braces to the catch block to fix syntax error.
        console.error("Erro ao salvar o perfil do usuário:", error);
    }
};