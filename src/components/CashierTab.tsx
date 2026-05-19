/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Minus, Trash2, CreditCard, Eraser, Package, ShoppingCart, Barcode, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { Product, CartItem, Transaction } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { toast } from 'sonner';

interface CashierTabProps {
  products: Product[];
  transactions: Transaction[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onComplete: (transaction: Transaction) => void;
}

export default function CashierTab({ products, transactions, cart, setCart, onComplete }: CashierTabProps) {
  const [search, setSearch] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['Semua', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Semua' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const todayTransactions = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    return transactions.filter(t => t.timestamp >= today);
  }, [transactions]);

  const dailyRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Stok ${product.name} tidak mencukupi`);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.stock <= 0) {
        toast.error(`Stok ${product.name} habis`);
        return prev;
      }
      toast.success(`${product.name} ditambahkan`);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearch) return;

    const product = products.find(p => p.barcode === barcodeSearch);
    if (product) {
      addToCart(product);
      setBarcodeSearch('');
    } else {
      toast.error(`Produk dengan barcode ${barcodeSearch} tidak ditemukan`);
      setBarcodeSearch('');
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty > (product?.stock || 0) && delta > 0) {
            toast.error('Stok tidak mencukupi');
            return item;
          }
          return { ...item, quantity: Math.max(0, newQty) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }, [subtotal, discountType, discountValue]);

  const total = Math.max(0, subtotal - discountAmount);
  const change = typeof paidAmount === 'number' ? paidAmount - total : 0;

  const handleCheckout = () => {
    if (typeof paidAmount !== 'number' || paidAmount < total) return;

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      subtotal,
      discountType: discountValue > 0 ? discountType : undefined,
      discountValue: discountValue > 0 ? discountValue : undefined,
      total,
      paidAmount,
      change,
      timestamp: Date.now(),
    };

    onComplete(transaction);
    setShowCheckout(false);
    setPaidAmount('');
    setDiscountValue(0);
  };

  return (
    <div className="grid grid-cols-12 gap-6 items-start">
      {/* Products Column */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <form onSubmit={handleBarcodeSearch} className="flex bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 w-full md:w-64 group focus-within:ring-2 focus-within:ring-indigo-600 transition-all">
            <Barcode className="w-5 h-5 text-indigo-400 mr-2 group-focus-within:text-indigo-600" />
            <input 
              type="text" 
              placeholder="Scan Barcode..." 
              className="bg-transparent border-none outline-none text-sm w-full text-indigo-900 placeholder:text-indigo-300 h-6 font-mono"
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              autoFocus
            />
          </form>
          <div className="flex-1 flex bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 w-full">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Cari produk atau kategori..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-600 h-6"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto scrollbar-hide">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeCategory === cat 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
            {filteredProducts.map(product => {
              const inCart = cart.find(item => item.id === product.id);
              return (
                <div 
                  key={product.id} 
                  className={`bg-white p-2 rounded-xl border-2 transition-all shadow-sm cursor-pointer relative group ${
                    inCart ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-transparent hover:border-indigo-500'
                  } ${product.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                  onClick={() => addToCart(product)}
                >
                  {inCart && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg z-10 scale-110">
                      {inCart.quantity}
                    </div>
                  )}
                  <div className="w-full aspect-square bg-slate-50 rounded-lg mb-2 flex items-center justify-center text-slate-200 group-hover:text-indigo-200 transition-colors overflow-hidden relative">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="w-8 h-8" />
                    )}
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest border border-white px-1 py-0.5 rotate-[-12deg]">Habis</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-800 truncate leading-tight">{product.name}</h3>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <p className="text-indigo-600 font-bold text-[11px] font-mono leading-none">{formatCurrency(product.price)}</p>
                    <span className={`text-[8px] font-bold uppercase ${product.stock <= 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                      Stok: {product.stock}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Omzet Hari Ini</p>
            <h4 className="text-xl font-black text-slate-800 font-mono">{formatCurrency(dailyRevenue)}</h4>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Transaksi</p>
            <h4 className="text-xl font-black text-slate-800">{todayTransactions.length} Pesanan</h4>
          </div>
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm transition-transform hover:scale-[1.02]">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Total Item Jual</p>
            <h4 className="text-xl font-black text-indigo-700">{products.length} Produk</h4>
          </div>
        </div>
      </div>

      {/* Cart Column */}
      <div className="col-span-12 lg:col-span-4 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[calc(100vh-200px)] sticky top-6">
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-black text-slate-800">Detail Pesanan</h2>
            <button 
              className="text-xs text-rose-500 font-bold hover:underline"
              onClick={() => setCart([])}
              disabled={cart.length === 0}
            >
              Bersihkan
            </button>
          </div>
          <p className="text-xs text-slate-400 font-mono">TX-{format(Date.now(), 'yyyyMMdd')}-{(transactions.length + 1).toString().padStart(4, '0')}</p>
        </div>

        <ScrollArea className="flex-1 p-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 py-20">
              <ShoppingCart className="w-16 h-16 opacity-10" />
              <p className="text-sm font-bold text-center italic opacity-40">Keranjang masih kosong</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 group animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 text-xs">
                    {item.quantity}x
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{item.category}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-bold text-slate-800 font-mono">{formatCurrency(item.price * item.quantity)}</p>
                    <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center hover:bg-slate-200">
                        <Minus className="w-3 h-3" />
                      </button>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center hover:bg-slate-200">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-slate-500 font-medium">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-slate-500 font-medium">
                <span>Diskon</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                  <button 
                    onClick={() => setDiscountType('percentage')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${discountType === 'percentage' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    %
                  </button>
                  <button 
                    onClick={() => setDiscountType('amount')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${discountType === 'amount' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    RP
                  </button>
                </div>
              </div>
              <div className="relative">
                <Input 
                  type="number"
                  min="0"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="h-8 text-right font-mono text-xs rounded-lg border-slate-200 bg-white"
                  placeholder="0"
                />
                {discountValue > 0 && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    -{formatCurrency(discountAmount)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between text-sm text-slate-500 font-medium">
              <span>Pajak (0%)</span>
              <span className="font-mono">Rp 0</span>
            </div>
            <div className="flex justify-between text-lg font-black text-slate-800 pt-3 border-t border-slate-200">
              <span>Total</span>
              <span className="text-indigo-600 font-mono tracking-tight">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button className="flex flex-col items-center justify-center py-3 border border-indigo-200 rounded-xl bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-colors shadow-sm active:scale-95">
              <CreditCard className="w-5 h-5 mb-1" />
              <span className="text-[9px] uppercase tracking-wider">TRANSFER</span>
            </button>
            <button className="flex flex-col items-center justify-center py-3 border border-slate-200 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition-colors shadow-sm active:scale-95">
              <CreditCard className="w-5 h-5 mb-1" />
              <span className="text-[9px] uppercase tracking-wider">TUNAI</span>
            </button>
          </div>

          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-7 rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] text-lg uppercase tracking-tight"
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            BAYAR SEKARANG
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Pembayaran</DialogTitle>
            <DialogDescription>Masukkan jumlah uang yang diterima dari pelanggan.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
              <span className="text-slate-500">Tagihan</span>
              <span className="text-2xl font-bold font-mono">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidAmount">Uang Diterima</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                <Input 
                  id="paidAmount"
                  type="number" 
                  className="pl-12 h-14 text-xl font-bold rounded-2xl focus-visible:ring-slate-900" 
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-between items-center px-2">
              <span className="text-slate-500">Kembalian</span>
              <span className={`text-xl font-bold font-mono ${change < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {change < 0 ? '-' : formatCurrency(change)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Array.from(new Set([total, total + 5000, total + 10000, total + 50000, 50000, 100000])).filter(val => val > 0).sort((a,b) => a-b).map(val => (
                <Button 
                  key={`preset-${val}`} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPaidAmount(val)}
                  className="rounded-xl border-slate-200 hover:bg-slate-50"
                  type="button"
                >
                  {val >= 1000000 ? `${val/1000000}jt` : val >= 1000 ? `${val/1000}rb` : val}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-bold bg-slate-900 hover:bg-black"
              disabled={typeof paidAmount !== 'number' || paidAmount < total}
              onClick={handleCheckout}
            >
              Simpan & Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
