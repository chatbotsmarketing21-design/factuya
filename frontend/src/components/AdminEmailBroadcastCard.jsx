import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { Mail, Loader2, Send } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_SUBJECT = '🎃 ¡Sorteo de Halloween: Gana un TV KALLEY 60" QLED 4K!';
const DEFAULT_BODY = `¡Tenemos una sorpresa de Halloween para ti! 📺
Suscríbete a Premium en FactuYa y recibe tu número de la suerte de 4 cifras.
Ganas el televisor si tu número coincide con el Sorteo #4859 de la Lotería de Medellín este viernes 30 de octubre en la noche.
¡No te quedes por fuera, participa ya!`;

export const AdminEmailBroadcastCard = () => {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [includeBanner, setIncludeBanner] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const pollStatus = (broadcastId) => {
    const token = localStorage.getItem('token');
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/email-broadcast/${broadcastId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data);
        if (data.status === 'done') {
          clearInterval(pollRef.current);
          setSending(false);
        }
      } catch (e) { /* keep polling */ }
    }, 2500);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/email-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, body, include_raffle_banner: includeBanner }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al enviar');
      setStatus({ status: 'sending', total: data.total, sent: 0, failed: 0 });
      pollStatus(data.broadcastId);
    } catch (error) {
      setStatus({ status: 'error', error: error.message });
      setSending(false);
    }
  };

  return (
    <Card className="mb-8 dark:bg-card" data-testid="admin-email-broadcast-card">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-orange-500" /> Enviar correo a todos
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Envía un correo masivo a todos los usuarios registrados. ⚠️ Si el dominio no está verificado en Resend,
          los correos solo llegarán al correo dueño de la cuenta Resend.
        </p>

        <div className="space-y-3">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del correo"
            data-testid="email-broadcast-subject"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Mensaje (cada línea será un párrafo)"
            data-testid="email-broadcast-body"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeBanner}
              onChange={(e) => setIncludeBanner(e.target.checked)}
              className="accent-orange-500 w-4 h-4"
              data-testid="email-broadcast-banner-check"
            />
            Incluir el banner del sorteo 🎃 en el correo
          </label>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={sending || !subject.trim() || !body.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            data-testid="email-broadcast-send-btn"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {sending ? 'Enviando...' : 'Enviar correo a todos'}
          </Button>

          {status && status.status !== 'error' && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300" data-testid="email-broadcast-status">
              {status.status === 'done'
                ? `✅ Terminado — Enviados: ${status.sent} · Fallidos: ${status.failed} de ${status.total}`
                : `📤 Enviando... ${(status.sent || 0) + (status.failed || 0)}/${status.total} (exitosos: ${status.sent || 0})`}
            </p>
          )}
          {status?.status === 'error' && (
            <p className="text-sm font-medium text-red-500">❌ {status.error}</p>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="email-broadcast-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar correo a TODOS los usuarios?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará el correo "{subject}" a todos los usuarios registrados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="email-broadcast-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="email-broadcast-confirm"
            >
              Sí, enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminEmailBroadcastCard;
