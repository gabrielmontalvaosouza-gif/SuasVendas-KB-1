import React, { useState, useEffect } from 'react';
import {
  AtSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  CheckCheck,
  Hash,
  MessageSquare,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { User, UserMention, ChatChannel } from '../../types/bugs';
import { bugService } from '../../services/api';

interface MentionsViewProps {
  currentUser: User;
  channels: ChatChannel[];
  onOpenMessageInChat: (channelId: string, messageId: string) => void;
  onShowToast: (msg: string) => void;
}

export const MentionsView: React.FC<MentionsViewProps> = ({
  currentUser,
  channels,
  onOpenMessageInChat,
  onShowToast,
}) => {
  const [mentions, setMentions] = useState<UserMention[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const loadMentions = async () => {
    setIsLoading(true);
    try {
      const data = await bugService.getUserMentions(currentUser.id, filterMode === 'UNREAD');
      setMentions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMentions();
  }, [currentUser.id, filterMode]);

  // Listen to real-time mention events
  useEffect(() => {
    const unsub = bugService.subscribe((event) => {
      if (event.type === 'MENTION_CREATED') {
        const newMention: UserMention = event.payload;
        if (newMention.user_id === currentUser.id) {
          setMentions((prev) => [newMention, ...prev]);
        }
      } else if (event.type === 'MENTIONS_READ_ALL') {
        if (event.payload.user_id === currentUser.id) {
          setMentions((prev) => prev.map((m) => ({ ...m, is_read: true })));
        }
      }
    });
    return unsub;
  }, [currentUser.id]);

  const handleToggleRead = async (mention: UserMention) => {
    try {
      await bugService.markMentionRead(mention.id);
      setMentions((prev) =>
        prev.map((m) => (m.id === mention.id ? { ...m, is_read: true } : m))
      );
      onShowToast('Menção marcada como lida.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await bugService.markAllMentionsRead(currentUser.id);
      setMentions((prev) => prev.map((m) => ({ ...m, is_read: true })));
      onShowToast('Todas as menções foram marcadas como lidas.');
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = mentions.filter((m) => !m.is_read).length;
  const filteredMentions = filterMode === 'UNREAD'
    ? mentions.filter((m) => !m.is_read)
    : mentions;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <AtSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              Minhas Menções
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-xs">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mensagens onde você foi citado diretamente (@) ou via @todos nos canais técnicos de atendimento e bugs
            </p>
          </div>
        </div>

        {/* Filter controls and mark all read */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center text-xs border border-transparent dark:border-slate-700/60">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Todas ({mentions.length})
            </button>
            <button
              onClick={() => setFilterMode('UNREAD')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filterMode === 'UNREAD'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-transparent dark:border-slate-700/60"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar todas como lidas</span>
            </button>
          )}
        </div>
      </div>

      {/* Mentions List */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
            Carregando suas menções...
          </div>
        ) : filteredMentions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 shadow-xs transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 mx-auto flex items-center justify-center mb-3">
              <AtSign className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Nenhuma menção encontrada</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {filterMode === 'UNREAD'
                ? 'Você não possui menções pendentes de leitura no momento.'
                : 'Quando colegas citarem você usando @ ou @todos no chat, as mensagens aparecerão aqui para acompanhamento rápido.'}
            </p>
          </div>
        ) : (
          filteredMentions.map((mention) => {
            const isUnread = !mention.is_read;
            return (
              <div
                key={mention.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 transition shadow-xs hover:shadow-md ${
                  isUnread
                    ? 'border-amber-300 dark:border-amber-500/50 ring-2 ring-amber-400/20 dark:ring-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      {mention.sender_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{mention.sender_name}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                          {mention.sender_role}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium flex items-center gap-1">
                          em <Hash className="w-3 h-3 inline text-slate-400 dark:text-slate-500" />
                          <b className="text-slate-700 dark:text-slate-200 font-semibold">{mention.channel_name}</b>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(mention.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUnread ? (
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                        Nova
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-400 text-[10px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Lida
                      </span>
                    )}

                    {isUnread && (
                      <button
                        onClick={() => handleToggleRead(mention)}
                        className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-md transition"
                        title="Marcar como lida"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content snippet */}
                <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans mb-3">
                  <span className="text-slate-400 dark:text-slate-400 font-mono text-[11px] block mb-1">
                    Trecho da mensagem:
                  </span>
                  <div className="whitespace-pre-wrap font-normal">
                    {mention.content}
                  </div>
                </div>

                {/* Footer action: Jump to Chat & Highlight */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-[11px] text-slate-400 dark:text-slate-400">
                    Clique ao lado para visualizar a mensagem completa no chat.
                  </div>
                  <button
                    onClick={() => {
                      if (isUnread) handleToggleRead(mention);
                      onOpenMessageInChat(mention.channel_id, mention.message_id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <span>Abrir no Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
