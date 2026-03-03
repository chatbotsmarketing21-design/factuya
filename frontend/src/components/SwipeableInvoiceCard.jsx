import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { CheckCircle, Share2, ChevronRight } from 'lucide-react';

const SwipeableInvoiceCard = ({ 
  invoice, 
  onView, 
  onMarkPaid, 
  onShare,
  statusColors 
}) => {
  const navigate = useNavigate();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(null); // 'left' | 'right' | null

  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 90;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      // Only allow horizontal swipe if it's clearly horizontal (not vertical scroll)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2) {
        const offset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, e.deltaX));
        setSwipeOffset(offset);
      }
    },
    onSwipedLeft: (e) => {
      // Only trigger if horizontal movement is dominant
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5 && Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        setIsRevealed('left');
        setSwipeOffset(-MAX_SWIPE);
      } else {
        setSwipeOffset(0);
        setIsRevealed(null);
      }
    },
    onSwipedRight: (e) => {
      // Only trigger if horizontal movement is dominant
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5 && Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        setIsRevealed('right');
        setSwipeOffset(MAX_SWIPE);
      } else {
        setSwipeOffset(0);
        setIsRevealed(null);
      }
    },
    onTap: () => {
      if (isRevealed) {
        setSwipeOffset(0);
        setIsRevealed(null);
      } else {
        // Navigate to invoice detail page on mobile
        navigate(`/invoice/${invoice.id}`);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false, // Allow vertical scroll
    delta: 15, // Minimum distance before detecting swipe
  });

  const handleActionClick = (action, e) => {
    e.stopPropagation();
    if (action === 'paid') {
      onMarkPaid(invoice.id, 'paid');
    } else if (action === 'share') {
      onShare(invoice.id);
    }
    // Reset swipe after action
    setTimeout(() => {
      setSwipeOffset(0);
      setIsRevealed(null);
    }, 200);
  };

  const resetSwipe = () => {
    setSwipeOffset(0);
    setIsRevealed(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="relative overflow-hidden bg-gray-50 dark:bg-gray-800 mb-1">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Left action - Pagado (revealed when swiping RIGHT) */}
        <div 
          className="w-1/2 bg-green-500 flex items-center justify-start pl-4"
          onClick={(e) => handleActionClick('paid', e)}
        >
          <div className="flex items-center gap-2 text-white font-medium">
            <CheckCircle className="w-5 h-5" />
            <span>Pagado</span>
          </div>
        </div>
        {/* Right action - Compartir (revealed when swiping LEFT) */}
        <div 
          className="w-1/2 bg-blue-500 flex items-center justify-end pr-4"
          onClick={(e) => handleActionClick('share', e)}
        >
          <div className="flex items-center gap-2 text-white font-medium">
            <span>Compartir</span>
            <Share2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main card content */}
      <div 
        {...handlers}
        onClick={() => {
          // Fallback click handler for when swipe is not active
          if (!isRevealed && swipeOffset === 0) {
            navigate(`/invoice/${invoice.id}`);
          }
        }}
        className="relative bg-white dark:bg-card flex items-center py-3 px-3 cursor-pointer border-b border-gray-100 dark:border-gray-700"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
        data-testid={`invoice-card-${invoice.id}`}
      >
        {/* Status indicator */}
        <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${getStatusColor(invoice.status)}`} />
        
        {/* Invoice info - left side */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {invoice.clientName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {invoice.number}
          </p>
        </div>

        {/* Amount and date - right side */}
        <div className="text-right ml-3 flex-shrink-0">
          <p className="font-bold text-gray-900 dark:text-white">
            {invoice.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {invoice.date}
          </p>
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
      </div>
    </div>
  );
};

export default SwipeableInvoiceCard;
