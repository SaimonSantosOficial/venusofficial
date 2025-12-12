export enum Role {
  User = 'user',
  Model = 'model',
}

export interface GroundingWebSource {
  uri: string;
  title: string;
}

export interface GroundingMetadata {
  groundingChunks: {
    web?: GroundingWebSource;
  }[];
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  groundingMetadata?: GroundingMetadata;
  image?: string; // Imagem gerada pelo modelo
  attachments?: string[]; // Imagens enviadas pelo usuário (Base64)
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  isPro?: boolean;
}