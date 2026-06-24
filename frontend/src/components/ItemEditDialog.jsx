import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Trash2 } from 'lucide-react';

/**
 * Modal for adding / editing a single invoice item.
 *
 * Props:
 *  - open: boolean — controls visibility
 *  - onOpenChange: (boolean) => void
 *  - item: { description, quantity, rate, amount } | null
 *  - onSave: (updatedItem) => void
 *  - onDelete: () => void   (optional — hidden when not provided)
 *  - itemNumber: number     (1-based, shown in title)
 *  - canDelete: boolean
 */
const ItemEditDialog = ({
  open,
  onOpenChange,
  item,
  onSave,
  onDelete,
  itemNumber = 1,
  canDelete = true,
}) => {
  const { t } = useTranslation();

  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [rate, setRate] = useState('');

  // Reset state every time a different item is loaded
  useEffect(() => {
    if (open) {
      setDescription(item?.description || '');
      // Default to "1" when the item is essentially empty so the user doesn't
      // have to type 1 manually for every brand-new line.
      const isEmpty = !item?.description && !item?.rate;
      const initialQty =
        item?.quantity !== undefined && item?.quantity !== null && Number(item.quantity) > 0
          ? String(item.quantity)
          : (isEmpty ? '1' : String(item?.quantity ?? '0'));
      setQuantity(initialQty);
      setRate(
        item?.rate !== undefined && item?.rate !== null && Number(item.rate) > 0
          ? String(item.rate)
          : ''
      );
    }
  }, [open, item]);

  const parsedQty = parseFloat(String(quantity).replace(',', '.')) || 0;
  const parsedRate = parseFloat(String(rate).replace(/\./g, '').replace(',', '.')) || 0;
  const amount = parsedQty * parsedRate;
  const formattedAmount = amount.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const formattedRate = parsedRate
    ? parsedRate.toLocaleString('es-CO', { maximumFractionDigits: 2 })
    : '';

  const handleSave = () => {
    onSave({
      description: description.trim(),
      quantity: parsedQty,
      rate: parsedRate,
      amount: amount,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
    onOpenChange(false);
  };

  // When the soft keyboard appears on mobile, scroll the focused input
  // into view so it doesn't get hidden behind the keyboard.
  const scrollIntoViewOnFocus = (e) => {
    const target = e.currentTarget;
    // Wait for the keyboard animation to finish before scrolling
    setTimeout(() => {
      try {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch (_) {
        /* noop */
      }
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:max-w-lg dark:bg-card max-h-[90vh] overflow-y-auto"
        data-testid="item-edit-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold dark:text-white">
            {t('invoice.editItemTitle', { number: itemNumber, defaultValue: `Editar artículo ${itemNumber}` })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Cantidad */}
          <div>
            <Label htmlFor="dlg-qty" className="dark:text-gray-300 text-sm font-medium">
              {t('invoice.quantity', { defaultValue: 'Cantidad' })}
            </Label>
            <Input
              id="dlg-qty"
              type="text"
              inputMode="decimal"
              autoFocus
              value={quantity}
              onFocus={scrollIntoViewOnFocus}
              onChange={(e) => {
                const v = e.target.value.replace(',', '.');
                if (v === '' || /^\d*\.?\d*$/.test(v)) setQuantity(v);
              }}
              className="dark:bg-secondary dark:border-border dark:text-white text-lg mt-1"
              data-testid="dlg-quantity-input"
            />
          </div>

          {/* Descripción */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <Label htmlFor="dlg-desc" className="dark:text-gray-300 text-sm font-medium">
                {t('invoice.description', { defaultValue: 'Descripción' })}
              </Label>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {description.length}/6000
              </span>
            </div>
            <Textarea
              id="dlg-desc"
              value={description}
              onFocus={scrollIntoViewOnFocus}
              onChange={(e) => setDescription(e.target.value.slice(0, 6000))}
              placeholder={t('invoice.descriptionPlaceholder', { defaultValue: 'Producto o servicio…' })}
              rows={4}
              className="dark:bg-secondary dark:border-border dark:text-white resize-none"
              data-testid="dlg-description-input"
            />
          </div>

          {/* Precio unitario */}
          <div>
            <Label htmlFor="dlg-rate" className="dark:text-gray-300 text-sm font-medium">
              {t('invoice.rate', { defaultValue: 'Precio unitario' })}
            </Label>
            <Input
              id="dlg-rate"
              type="text"
              inputMode="decimal"
              value={rate}
              onFocus={scrollIntoViewOnFocus}
              onChange={(e) => {
                const raw = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                if (raw === '' || /^\d*\.?\d*$/.test(raw)) setRate(raw);
              }}
              placeholder="0"
              className="dark:bg-secondary dark:border-border dark:text-white text-lg mt-1"
              data-testid="dlg-rate-input"
            />
            {formattedRate && (
              <p className="text-xs text-gray-400 mt-1">≈ ${formattedRate}</p>
            )}
          </div>

          {/* Importe (auto) */}
          <div className="bg-lime-50 dark:bg-lime-950/30 border border-lime-200 dark:border-lime-900 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('invoice.amount', { defaultValue: 'Importe' })}
            </span>
            <span
              className="text-xl font-bold text-lime-700 dark:text-lime-400"
              data-testid="dlg-amount"
            >
              ${formattedAmount}
            </span>
          </div>

          {/* OK button */}
          <Button
            onClick={handleSave}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold text-lg py-6 rounded-lg shadow-md"
            data-testid="dlg-save-button"
          >
            OK
          </Button>

          {/* Delete (only if applicable) */}
          {canDelete && onDelete && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                data-testid="dlg-delete-button"
              >
                <Trash2 className="w-4 h-4" />
                {t('invoice.deleteItem', { defaultValue: 'Borrar artículo' })}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemEditDialog;
