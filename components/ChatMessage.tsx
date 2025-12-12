import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, Role, GroundingWebSource } from '../types';
import { User, Sparkles, Copy, Check, FileCode, Globe, ChevronDown } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const languageMap: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  jsx: 'React (JSX)',
  tsx: 'React (TSX)',
  py: 'Python',
  rb: 'Ruby',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Bash',
  yaml: 'YAML',
  xml: 'XML',
  md: 'Markdown',
};

// Helper function to extract hostname for favicons
const getHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

// Helper component for source item
const SourceItem: React.FC<{ source: GroundingWebSource, index: number }> = ({ source, index }) => {
  const hostname = getHostname(source.uri);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

  return (
    <a 
      href={source.uri} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-[#18181b] hover:bg-[#27272a] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-200 group no-underline"
    >
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img 
          src={faviconUrl} 
          alt="" 
          className="w-4 h-4 object-contain opacity-80 group-hover:opacity-100"
          onError={(e) => {
             // Fallback if favicon fails
             (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Fallback Icon visible if img hidden */}
        <Globe size={14} className="text-gray-500 hidden group-hover:text-blue-400" style={{ display: 'none' }} /> 
      </div>
      
      <div className="flex-1 min-w-0">
         <div className="text-xs font-semibold text-gray-200 truncate group-hover:text-blue-400 transition-colors">
            {source.title || hostname}
         </div>
         <div className="text-[10px] text-gray-500 truncate mt-0.5">
            {hostname}
         </div>
      </div>
    </a>
  );
};

// Componente isolado para o Bloco de Código gerenciar seu próprio estado de cópia
const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Formata o nome da linguagem para exibição
  const langKey = (language || '').toLowerCase();
  const displayTitle = languageMap[langKey] || (langKey ? langKey.charAt(0).toUpperCase() + langKey.slice(1) : 'Texto');

  return (
    <div className="my-5 rounded-xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-md group/code">
      {/* Header do Código estilo Barra de Título */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e21] border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
           {/* Ícone de arquivo azul para destaque */}
           <FileCode size={14} className="text-blue-400" />
           <span className="text-xs font-semibold text-gray-200 font-sans tracking-wide">
             {displayTitle}
           </span>
        </div>
        
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-200 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md"
          title="Copiar código"
        >
          {isCopied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      
      {/* Área do Código com Scroll Horizontal Seguro */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700/50 scrollbar-track-transparent">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            backgroundColor: 'transparent',
            fontSize: '0.9em',
            lineHeight: '1.6',
            width: 'fit-content', 
            minWidth: '100%',     
          }}
          codeTagProps={{
            style: {
                whiteSpace: 'pre',
                display: 'block',
                fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                fontVariantLigatures: 'none'
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.User;
  const [copied, setCopied] = React.useState(false);
  const [showAllSources, setShowAllSources] = React.useState(false);

  // Extract unique web sources if they exist
  const uniqueSources = React.useMemo(() => {
    if (!message.groundingMetadata?.groundingChunks) return [];
    
    const chunks = message.groundingMetadata.groundingChunks;
    const sources: GroundingWebSource[] = [];
    const seenUris = new Set<string>();

    chunks.forEach(chunk => {
      if (chunk.web && !seenUris.has(chunk.web.uri)) {
        seenUris.add(chunk.web.uri);
        sources.push(chunk.web);
      }
    });
    return sources;
  }, [message.groundingMetadata]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`w-full group border-b ${
      isUser 
        ? 'bg-[#131316] border-white/5' // Destaque sutil para usuário
        : 'bg-transparent border-transparent' 
    } message-fade-in`}>
      <div className="max-w-3xl mx-auto p-4 md:px-4 md:py-8 flex gap-4 md:gap-6 w-full">
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border
          ${isUser 
            ? 'bg-[#2d2d30] border-transparent' 
            : 'bg-gradient-to-tr from-blue-500 to-cyan-500 border-transparent shadow-lg shadow-blue-500/20'
          }
        `}>
          {isUser ? (
            <User size={16} className="text-gray-300" />
          ) : (
            <Sparkles size={16} className="text-white fill-white" />
          )}
        </div>

        {/* Content - Grid fixes horizontal overflow issues with flex items */}
        <div className="relative flex-1 min-w-0 grid grid-cols-1">
          <div className="flex items-center justify-between mb-1">
             <div className="font-semibold text-sm text-gray-200">
                {isUser ? 'Você' : 'Gemini'}
            </div>
            {!isUser && !message.isStreaming && !message.isError && (
                <button 
                  onClick={handleCopyMessage}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white p-1"
                  title="Copiar mensagem inteira"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            )}
          </div>
          
          <div className={`markdown-content text-[0.95rem] leading-7 w-full ${
            message.isError ? 'text-red-400' : 'text-gray-300 font-light'
          }`}>
             {/* Model Generated Image */}
             {message.image && (
                <div className="mb-4 mt-1">
                  <img 
                    src={message.image} 
                    alt="Conteúdo gerado" 
                    className="rounded-xl border border-white/10 shadow-lg max-w-full md:max-w-md h-auto"
                  />
                </div>
             )}

             {/* User Attachments (Input Images) */}
             {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {message.attachments.map((src, idx) => (
                        <div key={idx} className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                            <img src={src} alt={`Anexo ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
             )}

             <ReactMarkdown
               components={{
                 code({node, inline, className, children, ...props}: any) {
                   const match = /language-(\w+)/.exec(className || '');
                   const codeValue = String(children).replace(/\n$/, '');

                   return !inline && match ? (
                     <CodeBlock language={match[1]} value={codeValue} />
                   ) : (
                     <code className={className} {...props}>
                       {children}
                     </code>
                   );
                 }
               }}
             >
               {message.content}
             </ReactMarkdown>
             
             {/* Cursor for streaming */}
             {message.isStreaming && (
               <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 animate-pulse align-middle rounded-full" />
             )}
          </div>

          {/* Sources Section */}
          {uniqueSources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/5 animate-in fade-in duration-500">
               <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Globe size={12} />
                  <span>Fontes</span>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                 {/* Show first 3 sources, or all if expanded */}
                 {uniqueSources
                    .slice(0, showAllSources ? undefined : 3)
                    .map((source, idx) => (
                      <SourceItem key={idx} source={source} index={idx} />
                    ))
                 }
               </div>

               {/* Show More Button */}
               {uniqueSources.length > 3 && !showAllSources && (
                 <button 
                   onClick={() => setShowAllSources(true)}
                   className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
                 >
                   <ChevronDown size={14} />
                   <span>Ver mais {uniqueSources.length - 3} fontes</span>
                 </button>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};