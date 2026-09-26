import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Hourglass, Share2 } from 'lucide-react';

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
  const daysLeft = Math.max(0, Math.ceil((new Date(promo.endsAt) - new Date()) / 86400000));
  const countdownLabel = daysLeft === 0 ? '¡HOY es el sorteo!' : daysLeft === 1 ? '¡Falta 1 día!' : `Faltan ${daysLeft} días`;

  const shareRaffle = async (e) => {
    e.stopPropagation();
    const text = `🎃 ¡Sorteo de Halloween en FactuYa! Gana un TV KALLEY 60" QLED 4K. Suscríbete a Premium y participa con tu número de la suerte. Sorteo #${promo.drawNumber} Lotería de Medellín — ${promo.drawDateLabel} 📺`;
    const url = 'https://factuya.site';
    try {
      const resp = await fetch('/raffle-banner.webp');
      const blob = await resp.blob();
      const file = new File([blob], 'sorteo-halloween-factuya.webp', { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${url}` });
        return;
      }
    } catch (err) { /* continue to fallback */ }
    if (navigator.share) {
      try { await navigator.share({ text, url }); return; } catch (err) { if (err.name === 'AbortError') return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
  };

  return (
    <div className={`${variant === 'landing' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto mb-6 rounded-xl overflow-hidden border border-orange-500/40 shadow-lg bg-[#1c0f2e]`} data-testid="raffle-banner">
      <button
        onClick={() => !hasNumber && navigate(ctaTarget)}
        className={`relative block w-full p-0 border-0 ${hasNumber ? 'cursor-default' : 'cursor-pointer'} group`}
        data-testid="raffle-cta"
        aria-label="Sorteo de Halloween: gana un TV KALLEY 60 pulgadas QLED 4K"
      >
        <img
          src="/raffle-banner.webp"
          alt='Sorteo Halloween: ¡Gánate esta TV KALLEY 60" QLED 4K UHD!'
          className={`w-full h-auto block ${hasNumber ? '' : 'transition-transform duration-300 group-hover:scale-[1.02]'}`}
          loading="lazy"
        />

        {/* Cuenta regresiva */}
        <span
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 inline-flex items-center gap-1.5 bg-black/75 backdrop-blur-sm border border-orange-400 text-orange-300 font-bold text-xs sm:text-sm rounded-full px-3 py-1.5 shadow-lg animate-pulse"
          data-testid="raffle-countdown"
        >
          <Hourglass className="w-3.5 h-3.5" /> {countdownLabel}
        </span>

        {/* Mensaje motivador sobre la imagen (solo si aún no participa) */}
        {!hasNumber && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-2.5 px-3 text-center">
            <span className="text-white font-extrabold text-sm sm:text-lg drop-shadow-md" data-testid="raffle-motivation">
              👉 ¡Pásate a <span className="text-orange-400">Premium</span> y participa!
            </span>
          </span>
        )}
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
        <button
          onClick={shareRaffle}
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5b] text-white text-sm font-bold rounded-full px-4 py-1.5 transition-colors"
          data-testid="raffle-share-btn"
          title="Compartir el sorteo"
        >
          <Share2 className="w-4 h-4" /> Compartir
        </button>
      </div>
    </div>
  );
};

export default RafflePromoBanner;
