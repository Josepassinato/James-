// services/databaseService.ts
import { UserProfile } from '../types';
import { createDefaultProfile } from './syncService'; // Import moved here to avoid circular dependency

const LOCAL_DB_KEY = 'james-assistant-db-profile';

/**
 * Simula a obtenção do perfil de um banco de dados local.
 * @returns {Promise<UserProfile | null>} O perfil do usuário ou nulo se não existir.
 */
export const getProfileFromDb = async (): Promise<UserProfile | null> => {
    try {
        const data = localStorage.getItem(LOCAL_DB_KEY);
        if (data) {
            return JSON.parse(data) as UserProfile;
        }
        // If nothing is in the DB, let's create and store a default profile.
        const defaultProfile = createDefaultProfile();
        await saveProfileToDb(defaultProfile);
        return defaultProfile;
    } catch (error) {
        console.error('Error getting profile from local DB:', error);
        return createDefaultProfile(); // Return default on error to prevent app crash
    }
};

/**
 * Simula o salvamento do perfil em um banco de dados local.
 * @param {UserProfile} profile O perfil do usuário a ser salvo.
 * @returns {Promise<void>}
 */
export const saveProfileToDb = async (profile: UserProfile): Promise<void> => {
    try {
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error('Error saving profile to local DB:', error);
    }
};