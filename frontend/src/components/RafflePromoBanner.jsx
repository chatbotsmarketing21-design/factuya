import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';

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
    <div className={`${variant === 'landing' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto mb-6 rounded-xl overflow-hidden border border-orange-500/40 shadow-lg bg-[#1c0f2e]`} data-testid="raffle-banner">
      <button
        onClick={() => !hasNumber && navigate(ctaTarget)}
        className={`block w-full p-0 border-0 ${hasNumber ? 'cursor-default' : 'cursor-pointer'} group`}
        data-testid="raffle-cta"
        aria-label="Sorteo de Halloween: gana un TV KALLEY 60 pulgadas QLED 4K"
      >
        <img
          src="/raffle-banner.webp"
          alt='Sorteo Halloween: ¡Gánate esta TV KALLEY 60" QLED 4K UHD!'
          className={`w-full h-auto block ${hasNumber ? '' : 'transition-transform duration-300 group-hover:scale-[1.02]'}`}
          loading="lazy"
        />
      </button>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4 py-2.5 bg-gradient-to-r from-[#1c0f2e] via-[#2d1445] to-[#1c0f2e]">
        {hasNumber ? (
          <>
            <span className="inline-flex items-center gap-2 text-orange-400 font-black text-lg tabular-nums" data-testid="raffle-number">
              <Ticket className="w-4 h-4" /> Tu número: <span className="tracking-[0.25em]">{entry.number}</span>
            </span>
            <span className="text-purple-200 text-xs sm:text-sm text-center">
              Sorteo <strong className="text-orange-300">#{promo.drawNumber} {promo.lottery}</strong> · {promo.drawDateLabel}
            </span>
          </>
        ) : (
          <>
            <span className="text-purple-200 text-xs sm:text-sm text-center">
              Suscríbete a <strong className="text-orange-300">Premium</strong> y recibe tu número de 4 cifras · Sorteo <strong className="text-orange-300">#{promo.drawNumber} {promo.lottery}</strong> · {promo.drawDateLabel}
            </span>
            <button
              onClick={() => navigate(ctaTarget)}
              className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-full px-5 py-1.5 transition-colors"
              data-testid="raffle-cta-btn"
            >
              ¡Quiero participar!
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RafflePromoBanner;
