// services/storageService.ts
import { UserProfile } from '../types';

const LOCAL_STORAGE_KEY = 'james-assistant-user-profile';

export function saveUserProfile(profile: UserProfile): void {
  try {
    const serializedProfile = JSON.stringify(profile);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedProfile);
  } catch (error) {
    console.error('Failed to save user profile to local storage:', error);
  }
}

export function loadUserProfile(): UserProfile | null {
  try {
    const serializedProfile = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedProfile === null) {
      return null;
    }
    return JSON.parse(serializedProfile);
  } catch (error) {
    console.error('Failed to load user profile from local storage:', error);
    return null;
  }
}
