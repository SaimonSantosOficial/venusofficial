import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Message, Role, ChatSession, AIModel } from './types';
import { getGeminiChat, sendMessageStream, AVAILABLE_MODELS } from './services/geminiService';
import { Menu, Plus, Sparkles, Code, PenTool, Lightbulb, ChevronDown, Zap, BrainCircuit, Image as ImageIcon } from 'lucide-react';
import { Chat } from '@google/genai';

const STORAGE_KEY = 'gemini-chat-history';

// Suggestions for empty state
const SUGGESTIONS = [
  { icon: <Code size={20} />, label: "Explicar código", prompt: "Pode me explicar como funciona um loop 'for' em Python com exemplos?" },
  { icon: <PenTool size={20} />, label: "Criar conteúdo", prompt: "Escreva um email profissional solicitando uma reunião de feedback." },
  { icon: <ImageIcon size={20} />, label: "Gerar Imagem", prompt: "Gere uma imagem futurista de uma cidade feita de cristal neon." },
  { icon: <Sparkles size={20} />, label: "Curiosidade", prompt: "Explique a teoria da relatividade como se eu tivesse 5 anos." },
];

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>(AVAILABLE_MODELS[0].id);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInstanceRef = useRef<Chat | null>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Close model menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedSessions: ChatSession[] = JSON.parse(saved);
        // Rehydrate Dates
        const hydratedSessions = parsedSessions.map(session => ({
          ...session,
          messages: session.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        // Sort by newest first
        hydratedSessions.sort((a, b) => b.createdAt - a.createdAt);
        setSessions(hydratedSessions);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    
    // Initialize a blank chat
    startNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save sessions to local storage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Sync current messages to the active session
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          // Update title if it's the first user message being finalized
          let title = session.title;
          if (title === 'Nova Conversa' && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === Role.User);
            if (firstUserMsg) {
              title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            }
          }
          return { ...session, messages, title };
        }
        return session;
      }));
    }
  }, [messages, currentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Re-initialize chat when model changes
  useEffect(() => {
    // Only text history is rebuilt here currently. 
    // Ideally, for multimodal history, we would need to store attachments in history too.
    const history = messages
      .filter(m => !m.isError)
      .map(m => {
        // Simple reconstruction for history
        // Note: Re-uploading images in history on refresh/model switch is complex with Gemini API 
        // as standard `history` object takes Parts.
        // For now we just pass text to maintain context, as re-sending base64 in history is heavy.
        return {
          role: m.role,
          parts: [{ text: m.content }]
        };
      });
    
    chatInstanceRef.current = getGeminiChat(selectedModelId, history);
  }, [selectedModelId, messages]);

  const startNewChat = useCallback(() => {
    chatInstanceRef.current = getGeminiChat(selectedModelId);
    setMessages([]);
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  }, [selectedModelId]);

  const handleSelectSession = (session: ChatSession) => {
    if (isLoading) return; // Prevent switching while generating

    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setIsSidebarOpen(false);
    
    // Instance is updated by the useEffect dependent on 'messages'
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));

    if (currentSessionId === sessionId) {
      startNewChat();
    }
  };

  const handleSendMessage = async (content: string, attachments: string[] = []) => {
    if ((!content.trim() && attachments.length === 0) || isLoading) return;

    // 1. Initialize session if new
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: activeSessionId,
        title: 'Nova Conversa',
        messages: [],
        createdAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(activeSessionId);
      
      // Ensure chat instance is ready
      if (!chatInstanceRef.current) {
        chatInstanceRef.current = getGeminiChat(selectedModelId);
      }
    }

    if (!chatInstanceRef.current) return;

    // 2. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: content.trim(),
      attachments: attachments, // Store user attachments
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 3. Add placeholder Model Message
      const modelMsgId = (Date.now() + 1).toString();
      const modelMsg: Message = {
        id: modelMsgId,
        role: Role.Model,
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, modelMsg]);

      // 4. Stream response
      const stream = await sendMessageStream(chatInstanceRef.current, content, attachments);

      for await (const chunk of stream) {
        const chunkText = chunk.text || ''; 
        
        // Check for grounding metadata (web search sources) in the chunk
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata as any;
        
        // Check for Image Parts (inlineData)
        let chunkImage: string | undefined = undefined;
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              chunkImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessageIndex = newMessages.findIndex((m) => m.id === modelMsgId);
          if (lastMessageIndex !== -1) {
            const updatedMessage = {
              ...newMessages[lastMessageIndex],
              content: newMessages[lastMessageIndex].content + chunkText,
            };

            // If we received grounding metadata, attach it to the message
            if (groundingMetadata) {
              updatedMessage.groundingMetadata = groundingMetadata;
            }
            
            // If we received an image, attach it
            if (chunkImage) {
               updatedMessage.image = chunkImage;
            }

            newMessages[lastMessageIndex] = updatedMessage;
          }
          return newMessages;
        });
      }

      // 5. Mark streaming as done
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.findIndex((m) => m.id === modelMsgId);
        if (lastMessageIndex !== -1) {
          newMessages[lastMessageIndex] = {
            ...newMessages[lastMessageIndex],
            isStreaming: false,
          };
        }
        return newMessages;
      });

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: Role.Model,
        content: "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  return (
    <div className="flex h-screen bg-[#09090b] text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar - Hidden on mobile unless toggled */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 w-72 bg-black/95 md:bg-transparent transform transition-transform duration-300 ease-in-out md:translate-x-0 border-r border-white/5
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          onNewChat={startNewChat} 
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Header (Desktop & Mobile combined logic) */}
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-20 pointer-events-none">
          {/* Left Side: Mobile Menu Trigger + Model Selector */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>

            {/* Model Selector Dropdown */}
            <div className="relative" ref={modelMenuRef}>
              <button 
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#1f1f23] transition-colors text-gray-200 font-medium text-lg"
              >
                <span>{currentModel.name}</span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isModelMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[#18181b] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left z-50">
                   <div className="p-1.5 space-y-0.5">
                     {AVAILABLE_MODELS.map((model) => (
                       <button
                         key={model.id}
                         onClick={() => {
                           setSelectedModelId(model.id);
                           setIsModelMenuOpen(false);
                         }}
                         className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                           selectedModelId === model.id ? 'bg-[#27272a]' : 'hover:bg-[#27272a]/50'
                         }`}
                       >
                         <div className={`mt-0.5 p-1.5 rounded border ${
                           selectedModelId === model.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400'
                         }`}>
                           {model.id.includes('image') ? <ImageIcon size={18} /> : (model.isPro ? <BrainCircuit size={18} /> : <Zap size={18} />)}
                         </div>
                         <div>
                           <div className="flex items-center gap-2">
                             <span className={`text-sm font-medium ${selectedModelId === model.id ? 'text-white' : 'text-gray-200'}`}>
                               {model.name}
                             </span>
                             {selectedModelId === model.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                           </div>
                           <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                             {model.description}
                           </p>
                         </div>
                       </button>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: New Chat (Mobile Only) */}
          <button 
            onClick={startNewChat}
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg transition-colors pointer-events-auto"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Messages List or Empty State */}
        <div className="flex-1 overflow-y-auto w-full scroll-smooth pt-16">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 max-w-4xl mx-auto">
              {/* Logo */}
              <div className="bg-gradient-to-tr from-blue-500 to-cyan-500 p-4 rounded-2xl mb-8 shadow-2xl shadow-cyan-500/20 animate-in fade-in zoom-in duration-500">
                 {currentModel.id.includes('image') ? (
                    <ImageIcon size={32} className="text-white" />
                 ) : currentModel.isPro ? (
                    <BrainCircuit size={32} className="text-white fill-white" />
                 ) : (
                    <Sparkles size={32} className="text-white fill-white" />
                 )}
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2 text-center">Como posso ajudar?</h2>
              <p className="text-gray-400 mb-12 text-center max-w-md">
                Utilizando <strong>{currentModel.name}</strong> para {currentModel.isPro ? 'tarefas complexas.' : currentModel.id.includes('image') ? 'gerar imagens.' : 'respostas rápidas.'}
              </p>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(suggestion.prompt)}
                    className="flex flex-col items-start p-4 bg-[#18181b] hover:bg-[#27272a] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-200 group text-left"
                  >
                    <div className="mb-2 text-gray-400 group-hover:text-blue-400 transition-colors">
                      {suggestion.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-200">{suggestion.label}</span>
                    <span className="text-xs text-gray-500 mt-1 line-clamp-1">{suggestion.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col pb-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="w-full bg-[#09090b] pt-2 pb-4 md:pb-8 relative z-10">
           {/* Gradient fade above input */}
           <div className="absolute top-[-50px] left-0 right-0 h-[50px] bg-gradient-to-t from-[#09090b] to-transparent pointer-events-none" />
           
            <ChatInput 
              onSend={handleSendMessage} 
              isLoading={isLoading} 
            />
            <p className="text-[11px] text-center text-gray-500 mt-3 font-medium opacity-60">
              O Gemini pode apresentar informações imprecisas. Verifique respostas importantes.
            </p>
        </div>
      </div>
    </div>
  );
};

export default App;