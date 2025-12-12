import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, Mic, X, Image as ImageIcon } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string, attachments: string[]) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: string[] = [];
      const files = Array.from(e.target.files) as File[];

      // Process all files
      for (const file of files) {
        // Simple check for image types
        if (!file.type.startsWith('image/')) continue;

        try {
          const base64 = await convertFileToBase64(file);
          newAttachments.push(base64);
        } catch (err) {
          console.error("Error reading file", err);
        }
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      
      // Reset input so same files can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if ((!content.trim() && attachments.length === 0) || isLoading) return;
    onSend(content, attachments);
    setContent('');
    setAttachments([]);
    // Reset height immediately
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto px-2 md:px-4">
      {/* Attachments Preview Area */}
      {attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2 mb-2 px-1 scrollbar-thin scrollbar-thumb-gray-700">
          {attachments.map((src, idx) => (
            <div key={idx} className="relative flex-shrink-0 group">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e21]">
                <img src={src} alt="attachment" className="w-full h-full object-cover" />
              </div>
              <button 
                onClick={() => removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5 border border-white/20 hover:bg-red-500 transition-colors shadow-sm"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end w-full p-1.5 md:p-2 bg-[#1e1e21] rounded-2xl border border-white/10 shadow-2xl focus-within:ring-1 focus-within:ring-white/20 focus-within:border-white/20 transition-all duration-300">
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect}
        />

        {/* Attachment Button */}
        <button 
          onClick={triggerFileSelect}
          className="p-3 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/5 mb-0.5"
          title="Anexar imagens"
        >
           <Paperclip size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachments.length > 0 ? "Adicione uma legenda..." : "Envie uma mensagem..."}
          className="w-full max-h-[200px] py-3.5 px-3 bg-transparent border-0 focus:ring-0 resize-none text-gray-100 placeholder-gray-500 leading-relaxed scrollbar-hide font-medium"
          rows={1}
          disabled={isLoading}
        />
        
        <div className="flex items-center gap-1 mb-1 mr-1">
            {/* Conditional Mic or Send */}
            {!content.trim() && attachments.length === 0 && (
                <button className="hidden sm:block p-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                    <Mic size={20} />
                </button>
            )}

            <button
            onClick={handleSubmit}
            disabled={(!content.trim() && attachments.length === 0) || isLoading}
            className={`
                p-2 rounded-xl transition-all duration-200 flex items-center justify-center
                ${(!content.trim() && attachments.length === 0) || isLoading 
                ? 'bg-transparent text-gray-600 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/10'
                }
            `}
            >
            {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : (
                <Send size={18} strokeWidth={2.5} />
            )}
            </button>
        </div>
      </div>
    </div>
  );
};