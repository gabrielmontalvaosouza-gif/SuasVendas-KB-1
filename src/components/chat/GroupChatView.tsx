import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  AtSign,
  Paperclip,
  Smile,
  Hash,
  Users,
  Info,
  Clock,
  Check,
  Shield,
  Download,
  Maximize2,
  Image as ImageIcon,
  X,
  User as UserIcon,
  Search,
  Lock,
  Plus,
  CheckSquare,
  Square,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { User, ChatChannel, ChatMessage, ChatAttachment, UserRole } from '../../types/bugs';
import { bugService } from '../../services/api';

const SYSTEM_CHANNEL_IDS = ['chan-geral', 'chan-bugs', 'chan-fiscal', 'chan-plantao'];

interface GroupChatViewProps {
  currentUser: User;
  allUsers: User[];
  channels: ChatChannel[];
  targetMessageId?: string | null;
  onClearTargetMessage?: () => void;
  onShowToast: (msg: string) => void;
  onChannelCreated?: (channel: ChatChannel) => void;
  onChannelDeleted?: (channelId: string) => void;
  onChannelUpdated?: (channel: ChatChannel) => void;
}

export const GroupChatView: React.FC<GroupChatViewProps> = ({
  currentUser,
  allUsers,
  channels,
  targetMessageId,
  onClearTargetMessage,
  onShowToast,
  onChannelCreated,
  onChannelDeleted,
  onChannelUpdated,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id || 'chan-geral');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Deletion Modal state (Section 12.4)
  const [channelToDelete, setChannelToDelete] = useState<ChatChannel | null>(null);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);

  // Edit Participants Modal state (Section 15.1 - Admin only)
  const [isEditParticipantsOpen, setIsEditParticipantsOpen] = useState(false);
  const [editParticipantsChannel, setEditParticipantsChannel] = useState<ChatChannel | null>(null);
  const [editParticipantIds, setEditParticipantIds] = useState<string[]>([]);
  const [editParticipantSearch, setEditParticipantSearch] = useState('');
  const [isSavingParticipants, setIsSavingParticipants] = useState(false);

  const handleOpenEditParticipants = (channel: ChatChannel) => {
    setEditParticipantsChannel(channel);
    setEditParticipantIds(channel.participant_ids ? [...channel.participant_ids] : []);
    setEditParticipantSearch('');
    setIsEditParticipantsOpen(true);
  };

  const handleToggleEditParticipant = (userId: string) => {
    setEditParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveParticipants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParticipantsChannel) return;
    if (editParticipantIds.length === 0) {
      alert('A conversa deve conter pelo menos 1 participante.');
      return;
    }
    setIsSavingParticipants(true);
    try {
      const res = await bugService.updateChatChannelParticipants(
        editParticipantsChannel.id,
        editParticipantIds
      );
      onChannelUpdated?.(res.channel);
      onShowToast(`Participantes da conversa "${editParticipantsChannel.name}" atualizados com sucesso!`);
      setIsEditParticipantsOpen(false);
      setEditParticipantsChannel(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar participantes.');
    } finally {
      setIsSavingParticipants(false);
    }
  };

  const handleConfirmDeleteChannel = async () => {
    if (!channelToDelete) return;
    setIsDeletingChannel(true);
    try {
      await bugService.deleteChatChannel(channelToDelete.id);
      onChannelDeleted?.(channelToDelete.id);
      onShowToast(`Conversa "${channelToDelete.name}" excluída com sucesso.`);
      if (selectedChannelId === channelToDelete.id) {
        setSelectedChannelId('chan-geral');
      }
      setChannelToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir conversa.');
    } finally {
      setIsDeletingChannel(false);
    }
  };

  // Mention autocomplete popup state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Attachment state
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachName, setAttachName] = useState('');

  // Built-in Lightbox state
  const [selectedLightboxAttachment, setSelectedLightboxAttachment] = useState<ChatAttachment | null>(null);

  // User card popover hover state
  const [hoveredUser, setHoveredUser] = useState<{ user: User; x: number; y: number } | null>(null);

  // New Custom Chat Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  const handleOpenNewChatModal = () => {
    setNewChatName('');
    setNewChatDescription('');
    setSelectedParticipantIds([]);
    setParticipantSearch('');
    setNewChatError(null);
    setIsNewChatModalOpen(true);
  };

  const handleToggleParticipant = (userId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewChatError(null);

    const cleanName = newChatName.trim();
    if (!cleanName) {
      setNewChatError('Informe um nome para a nova conversa.');
      return;
    }

    if (selectedParticipantIds.length === 0) {
      setNewChatError('Selecione pelo menos um participante para criar o chat restrito.');
      return;
    }

    setIsCreatingChat(true);
    try {
      const allParticipants = Array.from(new Set([currentUser.id, ...selectedParticipantIds]));
      const newChannel = await bugService.createChatChannel({
        name: cleanName,
        description: newChatDescription.trim() || undefined,
        participant_ids: allParticipants,
        created_by: currentUser.id,
      });

      onChannelCreated?.(newChannel);
      setSelectedChannelId(newChannel.id);
      setIsNewChatModalOpen(false);
      onShowToast(`Conversa #${newChannel.name} criada com sucesso!`);
    } catch (err: any) {
      setNewChatError(err.message || 'Erro ao criar conversa.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedLightboxAttachment) {
        setSelectedLightboxAttachment(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLightboxAttachment]);

  // Load channel messages
  useEffect(() => {
    if (!selectedChannelId) return;
    setIsLoading(true);
    bugService
      .getChatMessages(selectedChannelId)
      .then((data) => {
        setMessages(data);
      })
      .catch((err) => {
        console.error('Failed to load messages', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedChannelId]);

  // Real-time WebSocket subscription for incoming chat messages
  useEffect(() => {
    const unsubscribe = bugService.subscribe((event) => {
      if (event.type === 'CHAT_MESSAGE_CREATED') {
        const newMsg: ChatMessage = event.payload;
        if (newMsg.channel_id === selectedChannelId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [selectedChannelId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle targetMessageId deep link scroll
  useEffect(() => {
    if (targetMessageId) {
      setTimeout(() => {
        const el = document.getElementById(`msg-${targetMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50/50', 'dark:bg-amber-950/40');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50/50', 'dark:bg-amber-950/40');
            onClearTargetMessage?.();
          }, 3000);
        }
      }, 300);
    }
  }, [targetMessageId, onClearTargetMessage]);

  // Handle input changes and detect '@' trigger for mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n') {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setSelectedMentionIndex(0);
          return;
        }
      }
    }

    setMentionQuery(null);
    setMentionStartIndex(-1);
  };

  // Filtered users for mention autocomplete
  const filteredUsers = allUsers.filter((u) => {
    if (u.id === currentUser.id) return false;
    if (u.is_blocked) return false;
    if (!mentionQuery) return true;
    return (
      u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  });

  // Handle Ctrl+V image clipboard paste
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const dataUrl = uploadEvent.target?.result as string;
          const newAtt: ChatAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `Screenshot-${new Date().toLocaleTimeString('pt-BR').replace(/:/g, '')}.png`,
            file_type: 'image',
            size_bytes: file.size,
            url: dataUrl,
          };
          setAttachments((prev) => [...prev, newAtt]);
          onShowToast('Captura de tela colada com sucesso!');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle file input selection from computer
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 15 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite máximo permitido de 15 MB.`);
        return;
      }
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        const newAtt: ChatAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          file_type: isImg ? 'image' : 'document',
          size_bytes: file.size,
          url: dataUrl,
        };
        setAttachments((prev) => [...prev, newAtt]);
        onShowToast(`Anexo adicionado: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleSelectSpecialMention = (type: 'todos') => {
    if (mentionStartIndex === -1) return;
    const before = inputText.slice(0, mentionStartIndex);
    const after = inputText.slice(mentionStartIndex + 1 + (mentionQuery?.length || 0));
    const newText = `${before}@${type} ${after}`;
    setInputText(newText);
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setTimeout(() => {
      if (inputRef.current) {
        const nextPos = mentionStartIndex + type.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  const handleSelectMention = (user: User) => {
    if (mentionStartIndex === -1) return;
    const before = inputText.slice(0, mentionStartIndex);
    const after = inputText.slice(mentionStartIndex + 1 + (mentionQuery?.length || 0));
    const newText = `${before}@${user.name} ${after}`;
    setInputText(newText);
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setTimeout(() => {
      if (inputRef.current) {
        const nextPos = mentionStartIndex + user.name.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredUsers[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && attachments.length === 0) return;
    if (isSending) return;
    setIsSending(true);

    // Collect mention IDs
    const mentionIds: string[] = [];
    allUsers.forEach((u) => {
      if (inputText.includes(`@${u.name}`)) {
        mentionIds.push(u.id);
      }
    });

    try {
      await bugService.sendChatMessage({
        channel_id: selectedChannelId,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        content: inputText.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions: mentionIds,
      });

      setInputText('');
      setAttachments([]);
      setShowAttachInput(false);
      setMentionQuery(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  // Safe file download without navigating away
  const handleDownloadAttachment = (att: ChatAttachment) => {
    const link = document.createElement('a');
    link.href = att.url;
    link.download = att.name || 'anexo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`Download iniciado: ${att.name}`);
  };

  const renderMessageContent = (content: string) => {
    const userNames = allUsers.map((u) => u.name);
    if (userNames.length === 0) return content;

    const regex = new RegExp(`(@(${userNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'g');
    const parts = content.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === '@todos' || part.toLowerCase() === '@all') {
        return (
          <span
            key={index}
            className="bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow-2xs text-[11px]"
          >
            📢 @todos
          </span>
        );
      }
      if (part.startsWith('@')) {
        const foundUser = allUsers.find((u) => `@${u.name}`.toLowerCase() === part.toLowerCase());
        if (foundUser) {
          const isCurrentUser = foundUser.id === currentUser.id;
          return (
            <span
              key={index}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredUser({ user: foundUser, x: rect.left, y: rect.bottom + 6 });
              }}
              onMouseLeave={() => setHoveredUser(null)}
              className={`font-bold px-1 py-0.5 rounded-md cursor-pointer transition ${
                isCurrentUser
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {part}
            </span>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors">
      {/* ================= 1. CHANNELS SIDEBAR ================= */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 select-none transition-colors">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-2xs font-bold text-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-950 dark:text-white tracking-tight">Canais da Equipe</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Comunicação e avisos internos</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNewChatModal}
            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center gap-1 shadow-2xs text-[11px] font-semibold"
            title="Criar nova conversa personalizada"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {channels.map((chan) => {
            const isSelected = selectedChannelId === chan.id;
            const isCustom = !SYSTEM_CHANNEL_IDS.includes(chan.id);
            const canDelete = isCustom && (currentUser.role === 'ADMIN' || currentUser.permissions?.can_delete_channels || chan.created_by === currentUser.id);

            return (
              <div
                key={chan.id}
                onClick={() => setSelectedChannelId(chan.id)}
                className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 font-bold shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {chan.is_private ? (
                    <Lock className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />
                  ) : (
                    <Hash className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  )}
                  <div className="truncate flex-1">
                    <div className="text-xs truncate flex items-center gap-1.5">
                      <span className="truncate">{chan.name}</span>
                      {chan.is_private && (
                        <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shrink-0">
                          {chan.participant_ids?.length || 0}
                        </span>
                      )}
                    </div>
                    {chan.description && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-normal">
                        {chan.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions for custom channels (Section 12.4 & 15.1) */}
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChannelToDelete(chan);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition shrink-0 ml-1 cursor-pointer"
                    title="Excluir esta conversa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Online team summary */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Colaboradores Ativos</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{allUsers.length}</span>
          </div>
        </div>
      </div>

      {/* ================= 2. MESSAGES VIEW ================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        {/* Active Channel Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeChannel?.is_private ? (
              <Lock className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
            ) : (
              <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-950 dark:text-white truncate">{activeChannel?.name}</h3>
                {activeChannel?.is_private && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                    Restrito ({activeChannel.participant_ids?.length || 0} membros)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{activeChannel?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Section 15.1: Edit Participants Button (Exclusively for ADMIN) */}
            {currentUser.role === 'ADMIN' && activeChannel?.is_private && (
              <button
                type="button"
                onClick={() => handleOpenEditParticipants(activeChannel)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer shadow-2xs"
                title="Editar participantes da conversa (Exclusivo Administrador)"
              >
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Gerenciar Participantes</span>
              </button>
            )}

            {/* Section 12.4: Delete Custom Chat Button */}
            {activeChannel && !SYSTEM_CHANNEL_IDS.includes(activeChannel.id) && (currentUser.role === 'ADMIN' || activeChannel.created_by === currentUser.id) && (
              <button
                type="button"
                onClick={() => setChannelToDelete(activeChannel)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer shadow-2xs"
                title="Excluir esta conversa"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excluir Chat</span>
              </button>
            )}

            <div className="hidden xl:flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span>Use <strong className="font-mono text-blue-600 dark:text-blue-400">@todos</strong></span>
            </div>
          </div>
        </div>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
              Carregando mensagens...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-2 text-slate-500 dark:text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nenhuma mensagem neste canal ainda</p>
              <p className="text-[11px] max-w-sm">Inicie a conversa, envie perguntas sobre chamados técnicos ou cole prints de erros com Ctrl+V.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id;
              const hasMentionedMe = msg.mentions?.includes(currentUser.id);
              const senderUser = allUsers.find((u) => u.id === msg.sender_id);

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    hasMentionedMe
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  {/* Message sender header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      {senderUser?.avatar_url ? (
                        <img
                          src={senderUser.avatar_url}
                          alt={msg.sender_name}
                          className="w-7 h-7 rounded-lg object-cover border border-blue-500 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {msg.sender_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <span className="font-bold text-xs text-slate-950 dark:text-white">
                        {msg.sender_name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
                        {msg.sender_role}
                      </span>
                      {hasMentionedMe && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <AtSign className="w-2.5 h-2.5" />
                          Mencionou você
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message body */}
                  <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed pl-9 whitespace-pre-wrap font-normal">
                    {renderMessageContent(msg.content)}
                  </div>

                  {/* Attachments & Images rendering */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="pl-9 mt-3 flex flex-wrap gap-2.5">
                      {msg.attachments.map((att) => {
                        const isImage =
                          att.file_type === 'image' ||
                          att.url.startsWith('data:image') ||
                          /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(att.name || att.url);

                        if (isImage) {
                          return (
                            <div
                              key={att.id}
                              onClick={() => setSelectedLightboxAttachment(att)}
                              className="group/img relative cursor-pointer overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs hover:shadow-md transition max-w-xs"
                              title="Clique para ampliar esta imagem dentro do chat"
                            >
                              <img
                                src={att.url}
                                alt={att.name}
                                className="max-h-48 w-auto object-cover rounded-xl transition duration-200 group-hover/img:scale-[1.02]"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-slate-950/0 group-hover/img:bg-slate-950/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <span className="bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                                  <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Ampliar Imagem</span>
                                </span>
                              </div>
                              <div className="p-1.5 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-800 dark:text-slate-200 font-semibold truncate flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="truncate">{att.name}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs transition cursor-pointer font-medium shadow-2xs"
                            title="Clique para baixar este arquivo"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="font-semibold truncate max-w-[200px]">{att.name}</span>
                            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachments preview pending send */}
        {attachments.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
            {attachments.map((att) => {
              const isImg = att.file_type === 'image' || att.url.startsWith('data:image');
              return (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-2 p-1.5 pr-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs shadow-2xs"
                >
                  {isImg ? (
                    <img src={att.url} alt={att.name} className="w-7 h-7 object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                    className="text-slate-400 hover:text-rose-600 p-0.5 ml-1 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= 3. INPUT COMPOSER ================= */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative transition-colors">
          {/* Autocomplete Mentions Popup */}
          {mentionQuery !== null && (
            <div className="absolute bottom-full left-4 mb-2 w-80 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-40 animate-fade-in divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 font-bold text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Mencionar Colaborador</span>
                <span className="text-[10px] text-slate-400 font-normal">Enter ou clique para escolher</span>
              </div>

              {/* Special @todos option */}
              <div
                onClick={() => handleSelectSpecialMention('todos')}
                className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 cursor-pointer flex items-center gap-2.5 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                  📢
                </div>
                <div>
                  <div className="font-bold text-xs text-blue-600 dark:text-blue-400">@todos</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Mencionar e notificar toda a equipe autorizada</div>
                </div>
              </div>

              {/* Individual user suggestions */}
              <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">Nenhum colaborador encontrado</div>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectMention(u)}
                      className={`p-2 rounded-xl cursor-pointer flex items-center justify-between transition ${
                        idx === selectedMentionIndex
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="truncate">
                          <div className="text-xs truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {u.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Composer input box */}
          <div className="border border-slate-300 dark:border-slate-700 rounded-2xl p-2 bg-slate-50/80 dark:bg-slate-800/80 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={`Enviar mensagem em #${activeChannel?.name}... Digite @ para mencionar, cole prints com Ctrl+V ou anexe arquivos`}
              className="w-full text-xs text-slate-900 dark:text-slate-100 bg-transparent outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 p-1"
            />

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60 mt-1">
              <div className="flex items-center gap-1.5">
                {/* File picker button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt,.xml,.json,.log,.csv,.xlsx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                  title="Anexar arquivos ou fotos do computador"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Quick @todos trigger button */}
                <button
                  type="button"
                  onClick={() => {
                    setInputText((prev) => (prev ? `${prev} @todos ` : '@todos '));
                    inputRef.current?.focus();
                  }}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/70 hover:bg-blue-200 dark:hover:bg-blue-900 transition flex items-center gap-1"
                  title="Inserir menção @todos"
                >
                  <AtSign className="w-3 h-3" />
                  <span>@todos</span>
                </button>
              </div>

              {/* Send button */}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && attachments.length === 0) || isSending}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. IN-CHAT BUILT-IN LIGHTBOX MODAL ================= */}
      {selectedLightboxAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-fade-in"
          onClick={() => setSelectedLightboxAttachment(null)}
        >
          {/* Lightbox Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white pb-3 pt-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-white truncate max-w-md">
                  {selectedLightboxAttachment.name}
                </h4>
                {selectedLightboxAttachment.size_bytes && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(selectedLightboxAttachment.size_bytes / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadAttachment(selectedLightboxAttachment)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold"
                title="Baixar imagem no computador"
              >
                <Download className="w-4 h-4" />
                <span>Baixar</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLightboxAttachment(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition"
                title="Fechar visualização (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage */}
          <div
            className="flex-1 w-full max-w-5xl flex items-center justify-center p-2 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedLightboxAttachment.url}
              alt={selectedLightboxAttachment.name}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10 bg-slate-900/60"
            />
          </div>

          {/* Lightbox Footer */}
          <div className="text-[11px] text-slate-400 pt-2 shrink-0">
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">ESC</kbd> ou clique fora da imagem para voltar à conversa
          </div>
        </div>
      )}

      {/* User Hover Card Popover */}
      {hoveredUser && (
        <div
          style={{ top: hoveredUser.y, left: hoveredUser.x }}
          className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-xl w-60 pointer-events-none animate-fade-in"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {hoveredUser.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="truncate">
              <div className="font-bold text-xs text-slate-950 dark:text-white truncate">{hoveredUser.user.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{hoveredUser.user.email}</div>
            </div>
          </div>
          <div className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 inline-block font-bold">
            {hoveredUser.user.role}
          </div>
        </div>
      )}

      {/* Create New Custom Chat Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs font-bold text-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-950 dark:text-white">Criar Nova Conversa Restrita</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina o nome da conversa e selecione os participantes autorizados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewChat} className="p-5 overflow-y-auto space-y-4 flex-1">
              {newChatError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{newChatError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Conversa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Squad Suporte N2, Rejeições SEFAZ, Plantão Especial..."
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição ou Objetivo (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Alinhamento rápido para resolução de chamados prioritários"
                  value={newChatDescription}
                  onChange={(e) => setNewChatDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Participant Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Participantes Permitidos <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    {selectedParticipantIds.length + 1} participante(s) selecionado(s)
                  </span>
                </div>

                {/* Filter input for participants */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador por nome, e-mail ou cargo..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-950/40">
                  {/* Current User Row (Always included and checked) */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{currentUser.name}</span>
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-semibold">
                            Você (Criador)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{currentUser.email}</div>
                      </div>
                    </div>
                  </div>

                  {/* Other platform users */}
                  {allUsers
                    .filter((u) => u.id !== currentUser.id && !u.is_blocked)
                    .filter((u) => {
                      if (!participantSearch.trim()) return true;
                      const q = participantSearch.toLowerCase();
                      return (
                        u.name.toLowerCase().includes(q) ||
                        u.email.toLowerCase().includes(q) ||
                        u.role.toLowerCase().includes(q)
                      );
                    })
                    .map((user) => {
                      const isChecked = selectedParticipantIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleToggleParticipant(user.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                            isChecked
                              ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{user.name}</span>
                                <span className="text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded">
                                  {user.role}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChat || !newChatName.trim() || selectedParticipantIds.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isCreatingChat ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Criar Conversa Restrita</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 12.4 CONFIRM CHANNEL DELETION MODAL ================= */}
      {channelToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-950 dark:text-white">
                  Excluir Conversa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação não poderá ser desfeita
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <p>
                Tem certeza que deseja excluir permanentemente a conversa <strong>#{channelToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                Todas as mensagens, menções e arquivos anexados a este canal serão removidos do banco de dados para todos os participantes.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingChannel}
                onClick={() => setChannelToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingChannel}
                onClick={handleConfirmDeleteChannel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingChannel ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingChannel ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 15.1 EDIT CHANNEL PARTICIPANTS MODAL (ADMIN ONLY) ================= */}
      {isEditParticipantsOpen && editParticipantsChannel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-950 dark:text-white">
                    Gerenciar Participantes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Conversa: <strong>#{editParticipantsChannel.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditParticipantsOpen(false);
                  setEditParticipantsChannel(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveParticipants} className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Selecione quem pode visualizar e enviar mensagens nesta conversa:
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {editParticipantIds.length} selecionado(s)
                </span>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar por nome, email ou departamento..."
                  value={editParticipantSearch}
                  onChange={(e) => setEditParticipantSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500"
                />
              </div>

              {/* Users checklist */}
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-950/40">
                {allUsers
                  .filter((u) => !u.is_blocked)
                  .filter((u) => {
                    if (!editParticipantSearch.trim()) return true;
                    const q = editParticipantSearch.toLowerCase();
                    return (
                      u.name.toLowerCase().includes(q) ||
                      u.email.toLowerCase().includes(q) ||
                      (u.department || '').toLowerCase().includes(q) ||
                      u.role.toLowerCase().includes(q)
                    );
                  })
                  .map((user) => {
                    const isChecked = editParticipantIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleToggleEditParticipant(user.id)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                          isChecked
                            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{user.name}</span>
                              <span className="text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded shrink-0">
                                {user.role}
                              </span>
                              {user.department && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded shrink-0">
                                  {user.department}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSavingParticipants}
                  onClick={() => {
                    setIsEditParticipantsOpen(false);
                    setEditParticipantsChannel(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingParticipants || editParticipantIds.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingParticipants ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
