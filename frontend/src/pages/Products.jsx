import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { ArrowLeft, Plus, Package, Search, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { productAPI } from '../services/api';

const formatPrice = (v) =>
  Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const formatPriceInput = (v) => {
  if (v === '' || v === null || v === undefined) return '';
  const [intPart, decPart] = String(v).split('.');
  const formattedInt = intPart === '' ? '' : Number(intPart).toLocaleString('es-CO');
  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
};

export default function Products() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = new product
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      const res = await productAPI.list();
      setProducts(res.data);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudieron cargar los productos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openNew = () => {
    setEditing(null);
    setCode('');
    setDescription('');
    setPrice('');
    setUnit('');
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setCode(p.code || '');
    setDescription(p.description || '');
    setPrice(p.price ? String(p.price) : '');
    setUnit(p.unit || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast({ title: t('products.descriptionRequired'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      code: code.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      unit: unit.trim(),
    };
    try {
      if (editing) {
        await productAPI.update(editing.id, payload);
      } else {
        await productAPI.create(payload);
      }
      setDialogOpen(false);
      loadProducts();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.detail || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(t('products.deleteConfirm'))) return;
    try {
      await productAPI.remove(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? products.filter((p) =>
        (p.code || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    : products;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/create'))}
              data-testid="products-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-lime-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {t('products.title')}
              </h1>
            </div>
          </div>
          <Button
            onClick={openNew}
            className="bg-lime-500 hover:bg-lime-600 text-white font-semibold gap-1.5"
            size="sm"
            data-testid="add-product-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('products.addProduct')}</span>
            <span className="sm:hidden">{t('products.addShort')}</span>
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className="pl-9 bg-white dark:bg-secondary dark:border-border dark:text-white"
            data-testid="products-search-input"
          />
        </div>

        {/* List */}
        {loading ? (
          <p className="text-center text-gray-500 py-10">…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center dark:bg-card">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 dark:text-gray-200">
              {products.length === 0 ? t('products.empty') : t('products.noResults')}
            </p>
            {products.length === 0 && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('products.emptyDesc')}</p>
                <Button
                  onClick={openNew}
                  className="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-semibold gap-1.5"
                  data-testid="empty-add-product-btn"
                >
                  <Plus className="w-4 h-4" />
                  {t('products.addProduct')}
                </Button>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="p-3 sm:p-4 dark:bg-card flex items-center justify-between gap-3"
                data-testid={`product-row-${p.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.code && (
                      <span className="text-[11px] font-bold uppercase tracking-wide bg-lime-100 dark:bg-lime-950/40 text-lime-700 dark:text-lime-400 px-2 py-0.5 rounded">
                        {p.code}
                      </span>
                    )}
                    <p className="font-medium text-gray-900 dark:text-white truncate">{p.description}</p>
                  </div>
                  <p className="text-sm text-lime-700 dark:text-lime-400 font-bold mt-0.5">
                    ${formatPrice(p.price)}
                    {p.unit && <span className="text-gray-400 font-normal"> / {p.unit}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(p)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-lime-600"
                    data-testid={`edit-product-btn-${p.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    data-testid={`delete-product-btn-${p.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md dark:bg-card" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editing ? t('products.editProduct') : t('products.addProduct')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label className="dark:text-gray-300 text-sm">{t('products.description')} *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder={t('products.descriptionPlaceholder')}
                rows={2}
                className="dark:bg-secondary dark:border-border dark:text-white resize-none mt-1"
                data-testid="product-description-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="dark:text-gray-300 text-sm">{t('products.price')}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatPriceInput(price)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                    if (raw === '' || /^\d*\.?\d*$/.test(raw)) setPrice(raw);
                  }}
                  placeholder="0"
                  className="dark:bg-secondary dark:border-border dark:text-white mt-1"
                  data-testid="product-price-input"
                />
              </div>
              <div>
                <Label className="dark:text-gray-300 text-sm">{t('products.codeOptional')}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 30))}
                  placeholder={t('products.codePlaceholder')}
                  className="dark:bg-secondary dark:border-border dark:text-white mt-1"
                  data-testid="product-code-input"
                />
              </div>
            </div>
            <div>
              <Label className="dark:text-gray-300 text-sm">{t('products.unitOptional')}</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value.slice(0, 20))}
                placeholder={t('products.unitPlaceholder')}
                className="dark:bg-secondary dark:border-border dark:text-white mt-1"
                data-testid="product-unit-input"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-5"
              data-testid="product-save-btn"
            >
              {saving ? '…' : t('products.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
