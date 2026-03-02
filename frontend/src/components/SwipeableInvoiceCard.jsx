import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { CheckCircle, Share2, ChevronRight } from 'lucide-react';

const SwipeableInvoiceCard = ({ 
  invoice, 
  onView, 
  onMarkPaid, 
  onShare,
  statusColors 
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(null); // 'left' | 'right' | null

  const SWIPE_THRESHOLD = 80;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      // Limit the swipe distance
      const maxSwipe = 100;
      const offset = Math.max(-maxSwipe, Math.min(maxSwipe, e.deltaX));
      setSwipeOffset(offset);
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        setIsRevealed('left');
        setSwipeOffset(-100);
      } else {
        setSwipeOffset(0);
        setIsRevealed(null);
      }
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        setIsRevealed('right');
        setSwipeOffset(100);
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
        onView(invoice.id);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
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
    <div className="relative overflow-hidden rounded-lg mb-2">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Left action - Compartir (revealed when swiping right) */}
        <div 
          className="w-1/2 bg-blue-500 flex items-center justify-start pl-4"
          onClick={(e) => handleActionClick('share', e)}
        >
          <div className="flex items-center gap-2 text-white font-medium">
            <Share2 className="w-6 h-6" />
            <span>Compartir</span>
          </div>
        </div>
        {/* Right action - Pagado (revealed when swiping left) */}
        <div 
          className="w-1/2 bg-green-500 flex items-center justify-end pr-4"
          onClick={(e) => handleActionClick('paid', e)}
        >
          <div className="flex items-center gap-2 text-white font-medium">
            <span>Pagado</span>
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main card content */}
      <div 
        {...handlers}
        className="relative bg-white dark:bg-card flex items-center py-3 px-3 cursor-pointer transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
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
            ${invoice.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
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
