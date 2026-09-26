import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { RefreshCw, Ticket, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const AdminRaffleCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/raffle/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchParticipants(); }, []);

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  };

  return (
    <Card className="mb-8 dark:bg-card" data-testid="admin-raffle-card">
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🎃 Sorteo Halloween — Participantes ({data?.total ?? 0})
          </h2>
          <Button variant="outline" size="sm" onClick={fetchParticipants} disabled={loading} data-testid="raffle-refresh-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Gana quien tenga el número del sorteo <strong>#{data?.promo?.drawNumber || '4859'} {data?.promo?.lottery || 'Lotería de Medellín'}</strong> del {data?.promo?.drawDateLabel || '30 de octubre'}.
        </p>

        {loading && !data ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
        ) : !data?.participants?.length ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6">Aún no hay participantes (usuarios Premium activos)</p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Asignado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.participants.map((p) => (
                  <TableRow key={p.userId}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 font-black text-orange-600 dark:text-orange-400 tabular-nums tracking-widest">
                        <Ticket className="w-4 h-4" />{p.number}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium dark:text-white">{p.email}</TableCell>
                    <TableCell className="dark:text-gray-300">{p.name || 'Sin nombre'}</TableCell>
                    <TableCell className="dark:text-gray-300 text-xs">{p.plan || '—'}</TableCell>
                    <TableCell className="dark:text-gray-300 text-xs">{formatDate(p.assignedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdminRaffleCard;
