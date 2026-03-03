import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { CheckCircle, ChevronRight } from 'lucide-react';

const SwipeableInvoiceCard = ({ 
  invoice, 
  onView, 
  onMarkPaid, 
  onShare,
  statusColors 
}) => {
  const navigate = useNavigate();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 90;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      // Only allow horizontal swipe if it's clearly horizontal (not vertical scroll)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2) {
        if (isRevealed) {
          // Only allow left swipe to close
          const offset = Math.max(0, Math.min(MAX_SWIPE, MAX_SWIPE + e.deltaX));
          setSwipeOffset(offset);
        } else {
          // Only allow right swipe (positive deltaX)
          if (e.deltaX > 0) {
            const offset = Math.min(MAX_SWIPE, e.deltaX);
            setSwipeOffset(offset);
          }
        }
      }
    },
    onSwipedLeft: (e) => {
      // Close if revealed
      if (isRevealed) {
        setSwipeOffset(0);
        setIsRevealed(false);
      }
    },
    onSwipedRight: (e) => {
      // Only open if swipe is strong enough
      if (!isRevealed && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5 && Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        setIsRevealed(true);
        setSwipeOffset(MAX_SWIPE);
      } else {
        setSwipeOffset(0);
        setIsRevealed(false);
      }
    },
    onTap: () => {
      if (isRevealed) {
        // Execute paid action when tapped while revealed
        handleActionClick('paid');
      } else {
        // Navigate to invoice detail page on mobile
        navigate(`/invoice/${invoice.id}`);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false, // Allow vertical scroll
    delta: 20, // Increased minimum distance before detecting swipe
  });

  const handleActionClick = (action, e) => {
    if (e) e.stopPropagation();
    if (action === 'paid') {
      // Toggle: if paid -> pending, if pending -> paid
      const newStatus = invoice.status === 'paid' ? 'pending' : 'paid';
      onMarkPaid(invoice.id, newStatus);
    }
    // Reset swipe after action
    setTimeout(() => {
      setSwipeOffset(0);
      setIsRevealed(false);
    }, 200);
  };

  const resetSwipe = () => {
    setSwipeOffset(0);
    setIsRevealed(false);
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
      {/* Background action - Toggle Paid Status (revealed when swiping RIGHT) */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className={`w-full h-full flex items-center justify-start pl-4 pointer-events-auto ${invoice.status === 'paid' ? 'bg-yellow-500' : 'bg-green-500'}`}
          onClick={(e) => handleActionClick('paid', e)}
        >
          <div className="flex items-center gap-2 text-white font-medium">
            <CheckCircle className="w-5 h-5" />
            <span>{invoice.status === 'paid' ? 'No pagada' : 'Pagada'}</span>
          </div>
        </div>
      </div>

      {/* Main card content */}
      <div 
        {...handlers}
        onClick={(e) => {
          // If swipe is revealed and user clicks, execute the paid action
          if (isRevealed) {
            handleActionClick('paid', e);
            return;
          }
          // No swipe revealed, navigate to invoice detail
          if (swipeOffset === 0) {
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
