import React from 'react';
import { Bell, Check, CheckCheck, UploadCloud, RefreshCw, PlusCircle, AlertCircle, X } from 'lucide-react';
import { NotificationLog } from '../types/ooh';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationLog[];
  onMarkAllAsRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: NotificationLog['type']) => {
    switch (type) {
      case 'upload':
        return <UploadCloud className="w-4 h-4 text-blue-500" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4 text-emerald-500" />;
      case 'create':
        return <PlusCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="absolute right-4 top-16 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-sm text-slate-800">Notifikasi Otomatis</h3>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
            {notifications.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 transition-colors"
            title="Tandai semua telah dibaca"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tandai Dibaca</span>
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            Belum ada notifikasi otomatis.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 hover:bg-slate-50 transition-colors flex gap-3 items-start ${
                !notif.read ? 'bg-emerald-50/40' : ''
              }`}
            >
              <div className="p-1.5 rounded-lg bg-white shadow-xs border border-slate-200 flex-shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                    {notif.title}
                  </h4>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>
                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                  {formatTime(notif.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
        Sistem memantau setiap upload data dan update Google Sheets secara instan.
      </div>
    </div>
  );
};
