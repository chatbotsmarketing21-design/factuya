import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Gift, CheckCircle, AlertTriangle, Megaphone, Check, Trash2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Button } from './ui/button';
import { notificationAPI } from '../services/api';

// Map icon string from backend -> lucide component
const ICON_MAP = {
  gift: Gift,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  megaphone: Megaphone,
  bell: Bell,
};

const ACCENT_BG = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  lime: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString();
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.unreadCount();
      const n = res?.data?.count || 0;
      setUnreadCount((prev) => {
        if (n > prev) setShake(true); // animate when a new one arrives
        return n;
      });
    } catch (_) { /* silent */ }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.list(50);
      setItems(res?.data || []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + poll every 60s for badge count
  useEffect(() => {
    loadUnreadCount();
    const id = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(id);
  }, [loadUnreadCount]);

  // Stop the shake animation after it plays
  useEffect(() => {
    if (!shake) return;
    const id = setTimeout(() => setShake(false), 900);
    return () => clearTimeout(id);
  }, [shake]);

  const handleOpenChange = (val) => {
    setOpen(val);
    if (val) loadList();
  };

  const handleItemClick = async (n) => {
    if (!n.readAt) {
      try { await notificationAPI.markRead(n.id); } catch (_) { /* ignore */ }
      setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.link) {
      setOpen(false);
      // External URL (Play Store, etc.) → open in new tab. Internal route → SPA navigate.
      if (/^https?:\/\//i.test(n.link)) {
        window.open(n.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(n.link);
      }
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try { await notificationAPI.markAllRead(); } catch (_) { /* ignore */ }
    const now = new Date().toISOString();
    setItems((cur) => cur.map((x) => ({ ...x, readAt: x.readAt || now })));
    setUnreadCount(0);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try { await notificationAPI.remove(id); } catch (_) { /* ignore */ }
    setItems((cur) => cur.filter((x) => x.id !== id));
    loadUnreadCount();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative px-3 sm:px-3 h-11 sm:h-9 ${shake ? 'animate-[shake_0.9s_ease-in-out]' : ''}`}
          data-testid="notification-bell-button"
          aria-label="Notificaciones"
        >
          <Bell className="w-7 h-7 sm:w-4 sm:h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow"
              data-testid="notification-bell-badge"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 z-[60] dark:bg-card"
        data-testid="notification-popover"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-border">
          <p className="font-semibold dark:text-white">Notificaciones</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-lime-600 dark:text-lime-400 hover:underline font-medium"
              data-testid="mark-all-read-button"
            >
              <Check className="inline w-3 h-3 mr-0.5" />
              Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No tenés notificaciones</p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = ICON_MAP[n.icon] || Bell;
              const accent = ACCENT_BG[n.accent] || ACCENT_BG.lime;
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(n)}
                  className={`group relative px-4 py-3 border-b dark:border-border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40 ${isUnread ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="flex gap-3 items-start">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`text-sm font-medium leading-tight ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-3">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="absolute right-9 top-4 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, n.id)}
                    className="absolute right-3 top-3 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Eliminar"
                    data-testid={`notification-delete-${n.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
