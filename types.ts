// types.ts

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  isTyping?: boolean;
  actions?: { text: string; onClick: () => void; }[];
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  reminderSet?: boolean;
}

export type KnowledgeCategory = 'personal' | 'professional' | 'goals' | 'misc';

export type KnowledgeBase = {
  [key in KnowledgeCategory]?: KnowledgeItem[];
};

export interface Integrations {
    geolocation: boolean;
    smartGlasses: boolean;
    offlineMode: boolean;
}

export type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface UserProfile {
    systemInstruction: string;
    voiceName: VoiceName;
    integrations: Integrations;
    knowledgeBase: KnowledgeBase;
}