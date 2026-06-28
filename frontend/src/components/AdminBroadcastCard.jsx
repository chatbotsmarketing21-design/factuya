import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from '../hooks/use-toast';
import { Gift, CheckCircle, AlertTriangle, Megaphone, Bell, Send, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Same icon/color tokens used by NotificationBell so the live preview matches.
const ICONS = [
  { value: 'megaphone', label: 'Megáfono', Icon: Megaphone },
  { value: 'gift', label: 'Regalo', Icon: Gift },
  { value: 'check-circle', label: 'Check', Icon: CheckCircle },
  { value: 'alert-triangle', label: 'Aviso', Icon: AlertTriangle },
  { value: 'bell', label: 'Campana', Icon: Bell },
];

const ACCENTS = [
  { value: 'amber', label: 'Ámbar', bg: 'bg-amber-100 text-amber-700' },
  { value: 'lime', label: 'Verde', bg: 'bg-lime-100 text-lime-700' },
  { value: 'red', label: 'Rojo', bg: 'bg-red-100 text-red-700' },
  { value: 'blue', label: 'Azul', bg: 'bg-blue-100 text-blue-700' },
];

const AdminBroadcastCard = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [icon, setIcon] = useState('megaphone');
  const [accent, setAccent] = useState('amber');
  const [sending, setSending] = useState(false);

  const selectedIcon = ICONS.find((i) => i.value === icon) || ICONS[0];
  const selectedAccent = ACCENTS.find((a) => a.value === accent) || ACCENTS[0];
  const PreviewIcon = selectedIcon.Icon;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: 'Datos incompletos',
        description: 'El título y el mensaje son obligatorios.',
        variant: 'destructive',
      });
      return;
    }
    if (!window.confirm(`¿Enviar esta notificación a TODOS los usuarios registrados?`)) {
      return;
    }
    setSending(true);
    try {
      const resp = await fetch(`${API_URL}/api/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || null,
          icon,
          accent,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail || 'Error');
      toast({
        title: '✅ Notificación enviada',
        description: `Se entregó a ${data.sent} usuarios.`,
      });
      // Clear form
      setTitle('');
      setBody('');
      setLink('');
    } catch (err) {
      toast({
        title: 'No se pudo enviar',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="dark:bg-card mb-6" data-testid="admin-broadcast-card">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Enviar notificación a todos los usuarios
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label className="dark:text-gray-300">Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="🎁 Oferta especial"
                className="dark:bg-secondary dark:border-border dark:text-white"
                data-testid="broadcast-title-input"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/100</p>
            </div>

            <div>
              <Label className="dark:text-gray-300">Mensaje *</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 280))}
                placeholder="Aprovechá nuestro 50% OFF con LANZAMIENTO50…"
                rows={3}
                className="dark:bg-secondary dark:border-border dark:text-white resize-none"
                data-testid="broadcast-body-input"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/280</p>
            </div>

            <div>
              <Label className="dark:text-gray-300">Link al tocar (opcional)</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/subscription?coupon=LANZAMIENTO50"
                className="dark:bg-secondary dark:border-border dark:text-white"
                data-testid="broadcast-link-input"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ej: <code>/subscription</code>, <code>/dashboard</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="dark:text-gray-300 block mb-2">Ícono</Label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setIcon(value)}
                      title={label}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                        icon === value
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                      data-testid={`broadcast-icon-${value}`}
                    >
                      <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="dark:text-gray-300 block mb-2">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map(({ value, label, bg }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccent(value)}
                      title={label}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${bg} ${
                        accent === value ? 'border-gray-900 dark:border-white' : 'border-transparent'
                      }`}
                      data-testid={`broadcast-accent-${value}`}
                    >
                      <span className="text-xs font-bold">A</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-5 rounded-lg"
              data-testid="broadcast-send-button"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Enviar a todos los usuarios</>
              )}
            </Button>
          </div>

          {/* Live preview */}
          <div>
            <Label className="dark:text-gray-300 block mb-2">Vista previa</Label>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/30">
              <p className="text-xs text-gray-400 mb-3 text-center">
                Así se verá en la campanita 🔔
              </p>
              <div className="bg-white dark:bg-card border dark:border-border rounded-lg shadow-sm">
                <div className="px-4 py-3">
                  <div className="flex gap-3 items-start">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${selectedAccent.bg}`}>
                      <PreviewIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white">
                        {title || <span className="text-gray-400 italic">Título de la notificación</span>}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {body || <span className="italic">Mensaje de la notificación…</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">hace unos segundos</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                  </div>
                </div>
              </div>
              {link && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Al tocar irá a: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">{link}</code>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AdminBroadcastCard;
