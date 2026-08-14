import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Gift } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DURATIONS = [
  { value: '1m', label: '1 mes' },
  { value: '6m', label: '6 meses' },
  { value: '1y', label: '1 año' },
  { value: 'permanent', label: 'Permanente' },
];

export const AdminGiftPremiumCard = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [duration, setDuration] = useState('1y');
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    if (!email.trim()) {
      toast({ title: 'Escribe el correo del usuario', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/grant-premium`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email: email.trim(), duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      const until = data.premiumUntil
        ? `hasta ${new Date(data.premiumUntil).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`
        : 'permanente';
      toast({
        title: '🎁 Premium regalado',
        description: `${data.name || data.email} ahora es Premium (${until})`,
      });
      setEmail('');
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 dark:bg-card" data-testid="gift-premium-card">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-lime-600" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Regalar Premium</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <Label className="text-sm dark:text-gray-300">Correo del usuario</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@correo.com"
            className="mt-1 dark:bg-secondary dark:border-border dark:text-white"
            data-testid="gift-email-input"
          />
        </div>
        <div>
          <Label className="text-sm dark:text-gray-300">Duración</Label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 h-9 w-full sm:w-36 rounded-md border border-gray-300 dark:border-border bg-white dark:bg-secondary px-2 text-sm dark:text-white"
            data-testid="gift-duration-select"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleGrant}
          disabled={loading}
          className="bg-lime-500 hover:bg-lime-600 text-white font-semibold gap-1.5"
          data-testid="gift-grant-btn"
        >
          <Gift className="w-4 h-4" />
          {loading ? 'Activando…' : 'Regalar'}
        </Button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        El usuario debe estar registrado. Recibirá una notificación en la app y quedará con plan "Premium regalo" sin cobros automáticos.
      </p>
    </Card>
  );
};

export default AdminGiftPremiumCard;
