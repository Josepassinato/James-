// services/syncService.ts
import { getProfileFromDb, saveProfileToDb } from './databaseService';
import { getUserProfile as getProfileFromFirebase, updateUserProfile as saveProfileToFirebase } from './firebaseService';
import { UserProfile, KnowledgeBase, KnowledgeItem, KnowledgeCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Deep merge utility for knowledge bases
const mergeKnowledgeBases = (base: KnowledgeBase, updates: KnowledgeBase): KnowledgeBase => {
    const merged: KnowledgeBase = JSON.parse(JSON.stringify(base)); // Deep copy
    (Object.keys(updates) as KnowledgeCategory[]).forEach(category => {
        if (!merged[category]) {
            merged[category] = [];
        }
        const existingTitles = new Set(merged[category]!.map(item => item.title.toLowerCase()));
        updates[category]?.forEach(newItem => {
            if (!existingTitles.has(newItem.title.toLowerCase())) {
                merged[category]!.push({ ...newItem, id: uuidv4() });
            }
        });
    });
    return merged;
};


/**
 * Creates a default user profile.
 */
export const createDefaultProfile = (): UserProfile => {
  return {
    systemInstruction: `Você é James, um assistente de IA pessoal de classe mundial. Sua função é ser uma segunda mentalidade para o usuário, atuando como um conselheiro proativo, coach e gestor de tempo. Você tem consciência do tempo e do contexto. Use a Base de Conhecimento fornecida para personalizar todas as interações. Seja proativo, antecipe as necessidades e ajude o usuário a tomar decisões melhores.`,
    voiceName: 'Charon',
    integrations: {
        geolocation: false,
        smartGlasses: false,
        offlineMode: true,
    },
    knowledgeBase: {
        personal: [],
        professional: [],
        goals: [],
        misc: [],
    },
  };
};


/**
 * Synchronizes the user profile between local database and Firebase.
 * It fetches both, merges them, and saves the result back to both locations.
 * @returns The synchronized user profile.
 */
export const syncUserProfile = async (): Promise<UserProfile> => {
    console.log("Starting profile sync...");
    const localProfile = await getProfileFromDb();
    const remoteProfile = await getProfileFromFirebase();

    let syncedProfile: UserProfile;

    if (remoteProfile && localProfile) {
        console.log("Merging remote and local profiles.");
        syncedProfile = {
            ...localProfile, // Local settings are king during a session
            ...remoteProfile, // But remote settings overwrite if they exist
            knowledgeBase: mergeKnowledgeBases(localProfile.knowledgeBase, remoteProfile.knowledgeBase),
            integrations: remoteProfile.integrations || localProfile.integrations
        };
    } else if (remoteProfile) {
        console.log("Using remote profile.");
        syncedProfile = remoteProfile;
    } else if (localProfile) {
        console.log("Using local profile.");
        syncedProfile = localProfile;
    } else {
        console.log("No profile found, creating default.");
        syncedProfile = createDefaultProfile();
    }

    await saveProfileToDb(syncedProfile);
    await saveProfileToFirebase(syncedProfile);
    
    console.log("Sync complete.");
    return syncedProfile;
};


/**
 * Saves the entire profile to both local and remote storage.
 * @param profile The full user profile to save.
 */
export const saveAndSyncProfile = async (profile: UserProfile): Promise<void> => {
    await saveProfileToDb(profile);
    await saveProfileToFirebase(profile);
    console.log("Profile saved and synced.");
};

/**
 * Merges newly extracted knowledge into the user profile and syncs it.
 * @param currentProfile The current user profile.
 * @param newKnowledge The new knowledge base extracted from a conversation.
 * @returns The updated user profile.
 */
export const mergeAndSyncKnowledge = async (
    currentProfile: UserProfile,
    newKnowledge: KnowledgeBase
): Promise<UserProfile> => {
    const updatedProfile = {
        ...currentProfile,
        knowledgeBase: mergeKnowledgeBases(currentProfile.knowledgeBase, newKnowledge),
    };
    await saveAndSyncProfile(updatedProfile);
    return updatedProfile;
};


/**
 * Adds a new knowledge item to the profile and syncs it.
 * @param currentProfile The current user profile.
 * @param category The category to add the item to.
 * @param item The knowledge item (without id).
 * @returns The updated user profile.
 */
export const addKnowledgeItem = async (
    currentProfile: UserProfile,
    category: KnowledgeCategory,
    item: Omit<KnowledgeItem, 'id'>
): Promise<UserProfile> => {
    const newProfile = JSON.parse(JSON.stringify(currentProfile));
    
    if (!newProfile.knowledgeBase[category]) {
        newProfile.knowledgeBase[category] = [];
    }
    
    const newItem: KnowledgeItem = {
        ...item,
        id: uuidv4()
    };
    
    newProfile.knowledgeBase[category]!.push(newItem);
    await saveAndSyncProfile(newProfile);

    return newProfile;
};

/**
 * Finds a single knowledge item by its ID across all categories and updates it.
 * @param currentProfile The current user profile.
 * @param itemId The ID of the item to update.
 * @param updates An object with the properties to update.
 * @returns The updated user profile.
 */
export const updateAndSyncKnowledgeItem = async (
    currentProfile: UserProfile,
    itemId: string,
    updates: Partial<Omit<KnowledgeItem, 'id'>>
): Promise<UserProfile> => {
    const newProfile = JSON.parse(JSON.stringify(currentProfile)); // Deep copy
    let itemFound = false;

    for (const categoryKey of Object.keys(newProfile.knowledgeBase) as KnowledgeCategory[]) {
        const items = newProfile.knowledgeBase[categoryKey];
        if (items) {
            const itemIndex = items.findIndex(item => item.id === itemId);
            if (itemIndex !== -1) {
                items[itemIndex] = { ...items[itemIndex], ...updates };
                itemFound = true;
                break;
            }
        }
    }

    if (itemFound) {
        await saveAndSyncProfile(newProfile);
        return newProfile;
    }

    console.warn(`Knowledge item with ID ${itemId} not found for update.`);
    return currentProfile; // Return original profile if item not found
};