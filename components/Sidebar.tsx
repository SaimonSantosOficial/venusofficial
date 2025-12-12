import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, User } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  onNewChat: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (e: React.MouseEvent, sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onNewChat, 
  sessions, 
  currentSessionId, 
  onSelectSession,
  onDeleteSession
}) => {
  return (
    <div className="flex flex-col h-full bg-black/90 md:bg-[#09090b] border-r border-white/5 md:border-white/10 p-3">
      {/* New Chat Button */}
      <button 
        onClick={onNewChat}
        className="flex items-center gap-3 w-full px-4 py-3 mb-6 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all duration-200 shadow-sm group"
      >
        <div className="p-1 bg-white text-black rounded-md group-hover:scale-110 transition-transform duration-200">
           <Plus size={14} strokeWidth={3} />
        </div>
        <span>Nova Conversa</span>
      </button>

      {/* History Section */}
      <div className="flex-1 overflow-y-auto -mx-2 px-2 scrollbar-hide space-y-6">
        {sessions.length > 0 ? (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-3 px-3 uppercase tracking-wider">Histórico</div>
            <div className="space-y-1">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className={`
                    group flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-all cursor-pointer relative
                    ${currentSessionId === session.id 
                      ? 'bg-white/10 text-white shadow-inner' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }
                  `}
                >
                  <MessageSquare size={16} className={`flex-shrink-0 ${currentSessionId === session.id ? 'text-blue-400' : 'text-gray-600'}`} />
                  <span className="truncate flex-1 font-medium">{session.title}</span>
                  
                  {/* Fade out text effect on right */}
                  <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l to-transparent rounded-r-lg pointer-events-none
                     ${currentSessionId === session.id ? 'from-[#1a1a1c]' : 'from-[#09090b] group-hover:from-[#131315]'}
                  `} />

                  <button
                    onClick={(e) => onDeleteSession(e, session.id)}
                    className="absolute right-2 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Excluir conversa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center opacity-40 px-4">
             <MessageSquare size={32} className="mb-2" />
             <span className="text-sm">Suas conversas aparecerão aqui.</span>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="border-t border-white/5 pt-4 mt-2">
         <button className="w-full px-3 py-3 text-sm text-gray-300 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-colors text-left group">
           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg group-hover:shadow-indigo-500/20 transition-all">
             <User size={16} />
           </div>
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2">
                <span className="font-medium text-gray-200 truncate">Saimon Santos</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded leading-none">CEO</span>
             </div>
             <div className="text-xs text-gray-500 truncate">Pro</div>
           </div>
           <Settings size={16} className="text-gray-500 group-hover:text-gray-300" />
         </button>
      </div>
    </div>
  );
};