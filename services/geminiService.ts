import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { AIModel } from "../types";

// Ensure API key is present
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Missing process.env.API_KEY. The app will fail to communicate with Gemini.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `Você é um assistente de IA útil, inteligente e conhecedor, alimentado pelo Gemini. 
Seu objetivo é fornecer respostas precisas, concisas e bem formatadas.
Use Markdown para formatar blocos de código, listas e ênfase. 
Seja coloquial, mas profissional. Sempre responda em Português.`;

export const AVAILABLE_MODELS: AIModel[] = [
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    description: 'Equilíbrio ideal entre velocidade, inteligência e custo.',
    isPro: false
  },
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini Flash Lite',
    description: 'Modelo ultra-rápido e leve para tarefas simples.',
    isPro: false
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3.0 Pro', 
    description: 'Melhor raciocínio para problemas complexos, matemática e código.',
    isPro: true
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Geração rápida de imagens (sem suporte a pesquisa web).',
    isPro: false
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini 3.0 Pro Image',
    description: 'Imagens de alta fidelidade com suporte a pesquisa web.',
    isPro: true
  }
];

export const getGeminiChat = (modelId: string, history?: { role: string, parts: { text: string }[] }[]): Chat => {
  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.7,
    topK: 40,
  };

  // Google Search Tool logic:
  // Gemini 2.5 Flash Image does NOT support tools.
  // Gemini 3.0 Pro Image DOES support tools.
  // Standard text models support tools.
  if (modelId !== 'gemini-2.5-flash-image') {
    config.tools = [{ googleSearch: {} }];
  }

  // Configurações específicas para geração de imagem se for o modelo 3.0 Pro Image
  if (modelId === 'gemini-3-pro-image-preview') {
    config.imageConfig = {
      aspectRatio: "1:1",
      imageSize: "1K"
    };
  }

  return ai.chats.create({
    model: modelId,
    history: history || [],
    config: config,
  });
};

/**
 * Sends a message to the chat model.
 * Supports text and multiple image attachments.
 */
export const sendMessageStream = async (chat: Chat, message: string, attachments: string[] = []) => {
  try {
    let messagePayload: any;

    if (attachments.length === 0) {
      // Simple text message
      messagePayload = { message };
    } else {
      // Multimodal message (Text + Images)
      const parts: any[] = [];
      
      // Add text part if exists
      if (message.trim()) {
        parts.push({ text: message });
      }

      // Add image parts
      for (const base64Str of attachments) {
        // base64Str is usually "data:image/png;base64,....."
        // We need to extract mimeType and the raw base64 data
        const matches = base64Str.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            parts.push({
                inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                }
            });
        }
      }

      messagePayload = { message: parts };
    }

    const streamResult = await chat.sendMessageStream(messagePayload);
    return streamResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};