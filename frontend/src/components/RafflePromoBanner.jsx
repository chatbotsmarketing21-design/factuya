import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv, Ticket, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const RafflePromoBanner = ({ variant = 'dashboard' }) => {
  const [promo, setPromo] = useState(null);
  const [entry, setEntry] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URL}/api/raffle/promo`)
      .then((r) => r.json())
      .then((data) => { if (mounted) setPromo(data); })
      .catch(() => {});
    if (token) {
      fetch(`${API_URL}/api/raffle/my-entry`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => { if (mounted) setEntry(data); })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, [token]);

  if (!promo?.active) return null;

  const hasNumber = entry?.eligible && entry?.number;
  const ctaTarget = token ? '/subscription' : '/signup';

  return (
    <div
      className="relative overflow-hidden rounded-xl mb-6 p-5 sm:p-6 bg-gradient-to-r from-[#1c0f2e] via-[#2d1445] to-[#1a0b26] border border-orange-500/40 shadow-lg"
      data-testid="raffle-banner"
    >
      <div className="absolute -top-4 -right-2 text-6xl sm:text-7xl opacity-20 select-none" aria-hidden="true">🎃</div>
      <div className="absolute bottom-1 left-1/2 text-4xl opacity-10 select-none hidden sm:block" aria-hidden="true">👻</div>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
          <Tv className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-extrabold text-orange-400 ${variant === 'landing' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>
            🎃 Sorteo de Halloween: ¡Gana un {promo.prize}!
          </h3>
          {hasNumber ? (
            <p className="text-purple-200 text-sm mt-1">
              Ya estás participando. Sorteo <strong className="text-orange-300">#{promo.drawNumber} {promo.lottery}</strong> — {promo.drawDateLabel} en la noche.
            </p>
          ) : (
            <p className="text-purple-200 text-sm mt-1">
              Suscríbete a <strong className="text-orange-300">Premium</strong> y recibe tu número de 4 cifras.
              Ganas si coincide con el sorteo <strong className="text-orange-300">#{promo.drawNumber} {promo.lottery}</strong> del {promo.drawDateLabel}.
            </p>
          )}
        </div>

        {hasNumber ? (
          <div className="flex-shrink-0 text-center bg-black/40 border-2 border-dashed border-orange-400 rounded-lg px-5 py-2.5" data-testid="raffle-number">
            <p className="text-[10px] uppercase tracking-widest text-purple-300 flex items-center justify-center gap-1">
              <Ticket className="w-3 h-3" /> Tu número
            </p>
            <p className="text-3xl font-black text-orange-400 tabular-nums tracking-[0.2em]">{entry.number}</p>
          </div>
        ) : (
          <Button
            onClick={() => navigate(ctaTarget)}
            className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full px-6"
            data-testid="raffle-cta"
          >
            ¡Quiero participar! <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default RafflePromoBanner;
