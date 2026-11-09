import React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Flame,
  UserCheck,
  RotateCcw,
  MessageSquare,
  Clock,
  X,
  CheckCheck,
} from 'lucide-react';
import { BugNotification } from '../../types/bugs';

interface NotificationsDropdownProps {
  notifications: BugNotification[];
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification: (notif: BugNotification) => void;
  onMarkAllRead: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  notifications,
  isOpen,
  onClose,
  onSelectNotification,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'NEW_BUG':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'ASSIGNED':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'REOPENED':
        return <RotateCcw className="w-4 h-4 text-rose-600" />;
      case 'COMMENT':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      className="absolute right-0 mt-2 w-84 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh] text-xs animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-xs tracking-tight">Central de Notificações</span>
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] text-blue-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar lidas</span>
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white p-0.5 cursor-pointer" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhuma notificação recente.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                onSelectNotification(notif);
                onClose();
              }}
              className={`p-3 transition cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                !notif.is_read
                  ? 'bg-blue-50/50 dark:bg-blue-950/30 border-l-2 border-blue-600'
                  : 'bg-white dark:bg-slate-900'
              }`}
            >
              <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {getNotifIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-bold truncate ${!notif.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {notif.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 leading-snug line-clamp-2">
                  {notif.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  <span>Abrir chamado {notif.bug_code} ➔</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
