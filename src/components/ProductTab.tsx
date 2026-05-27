/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Package, PlusCircle, Camera, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Product, PurchaseRecord } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import BarcodeScanner from './BarcodeScanner';

interface ProductTabProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  onAddPurchase: (record: PurchaseRecord) => void;
  isAdmin: boolean;
}

export default function ProductTab({ products, onUpdateProducts, onAddPurchase, isAdmin }: ProductTabProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToAddStock, setProductToAddStock] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [addStockAmount, setAddStockAmount] = useState<number>(0);
  const [addStockPrice, setAddStockPrice] = useState<number>(0);
  const [addStockDate, setAddStockDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<Partial<Product>>({});

  // Search, Filter & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const categories = useMemo(() => {
    return ['Semua', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const adjustedCurrentPage = Math.min(currentPage, Math.max(1, totalPages));

  const paginatedProducts = useMemo(() => {
    const startIndex = (adjustedCurrentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, adjustedCurrentPage, itemsPerPage]);

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      costPrice: 0, 
      price: 0, 
      category: 'Lain-lain', 
      stock: 0, 
      image: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      satuan: 'Pcs'
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenAddStock = (product: Product) => {
    setProductToAddStock(product);
    setAddStockAmount(0);
    setAddStockPrice(product.costPrice);
    setAddStockDate(new Date().toISOString().split('T')[0]);
    setIsAddStockDialogOpen(true);
  };

  const confirmUpdateStock = () => {
    if (productToAddStock && addStockAmount > 0) {
      onUpdateProducts(products.map(p => {
        if (p.id === productToAddStock.id) {
          const totalExistingValue = p.stock * p.costPrice;
          const totalNewValue = addStockAmount * addStockPrice;
          const totalQuantity = p.stock + addStockAmount;
          // Calculate weighted average
          const newCostPrice = totalQuantity > 0 
            ? (totalExistingValue + totalNewValue) / totalQuantity 
            : addStockPrice;

          return { 
            ...p, 
            stock: totalQuantity, 
            costPrice: Math.round(newCostPrice), 
            purchaseDate: addStockDate 
          };
        }
        return p;
      }));

      // Record purchase
      onAddPurchase({
        id: Math.random().toString(36).substr(2, 9),
        productId: productToAddStock.id,
        productName: productToAddStock.name,
        quantity: addStockAmount,
        costPrice: addStockPrice,
        totalCost: addStockAmount * addStockPrice,
        date: addStockDate,
        timestamp: Date.now()
      });

      toast.success(`Stok ${productToAddStock.name} berhasil ditambah ${addStockAmount} (Tgl: ${addStockDate})`);
      setIsAddStockDialogOpen(false);
      setProductToAddStock(null);
    } else {
      toast.error('Jumlah stok harus lebih dari 0');
    }
  };

  const confirmDelete = () => {
    if (productToDelete) {
      onUpdateProducts(products.filter(p => p.id !== productToDelete.id));
      toast.success('Produk berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleSave = () => {
    if (!formData.name || formData.price === undefined || formData.costPrice === undefined || formData.stock === undefined || !formData.category) {
      toast.error('Semua kolom harus diisi');
      return;
    }

    const payload = { 
      ...formData,
      satuan: formData.satuan?.trim() || 'Pcs'
    };

    if (editingProduct) {
      onUpdateProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...payload } as Product : p));
      toast.success('Produk berhasil diperbarui');
    } else {
      const newProduct = {
        ...payload,
        id: Math.random().toString(36).substr(2, 9),
      } as Product;
      onUpdateProducts([...products, newProduct]);

      // Record purchase if initial stock > 0
      if (newProduct.stock > 0) {
        onAddPurchase({
          id: Math.random().toString(36).substr(2, 9),
          productId: newProduct.id,
          productName: newProduct.name,
          quantity: newProduct.stock,
          costPrice: newProduct.costPrice,
          totalCost: newProduct.stock * newProduct.costPrice,
          date: newProduct.purchaseDate || new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        });
      }

      toast.success('Produk berhasil ditambahkan');
    }
    setIsDialogOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File terlalu besar (maks 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Produk</p>
          <h4 className="text-xl font-black text-slate-800">{products.length} Items</h4>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Kategori</p>
          <h4 className="text-xl font-black text-slate-800">{new Set(products.map(p => p.category)).size} Grup</h4>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Stok Menipis</p>
          <h4 className="text-xl font-black text-rose-600">{products.filter(p => p.stock <= 5).length} Items</h4>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b bg-slate-50/50 py-6 px-8 gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Manajemen Produk</CardTitle>
            <p className="text-slate-500 text-sm mt-1">Daftar item yang tersedia di toko</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari nama / barcode..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 rounded-xl border-slate-200 h-10 focus-visible:ring-indigo-600 font-medium text-xs text-slate-700 w-full"
              />
            </div>
            {isAdmin && (
              <Button onClick={handleAdd} className="rounded-xl flex items-center gap-2 bg-slate-900 hover:bg-black font-bold text-xs uppercase tracking-wider h-10 px-6 shrink-0 justify-center">
                <Plus className="w-4 h-4" />
                Produk Baru
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filters and Items per Page controls */}
        <div className="px-8 py-4 bg-slate-50/30 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Grup:</span>
            <div className="flex bg-slate-100/80 border border-slate-200/60 rounded-xl p-0.5 gap-0.5 max-w-full overflow-x-auto no-scrollbar shrink-0">
              {categories.slice(0, 7).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm min-w-fit shrink-0 ml-auto sm:ml-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent border-none focus:ring-0 p-0 pr-6 text-xs text-slate-700 font-extrabold uppercase cursor-pointer outline-none"
            >
              <option value={5}>5 Baris</option>
              <option value={10}>10 Baris</option>
              <option value={20}>20 Baris</option>
              <option value={50}>50 Baris</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-200">
                <TableHead className="w-[100px] pl-8 font-bold text-xs uppercase text-slate-500">Icon</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Nama Produk</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Barcode</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Tgl Beli</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Kategori</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Stok</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Pembelian (HPP)</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Harga Jual</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Margin</TableHead>
                <TableHead className="text-right pr-8 font-bold text-xs uppercase text-slate-500">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-60 text-center text-slate-400 italic font-medium">
                    {products.length === 0 ? 'Belum ada produk terdaftar' : 'Tidak ada produk yang cocok dengan kriteria pencarian'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-100/50 transition-colors border-slate-100">
                    <TableCell className="pl-8">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{product.name}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-400">{product.barcode || '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">{product.purchaseDate || '-'}</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                        {product.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono font-bold ${product.stock <= 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {product.stock} {product.satuan || 'Pcs'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-slate-500">{formatCurrency(product.costPrice)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">{formatCurrency(product.price)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(product.price - product.costPrice)}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      {isAdmin ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenAddStock(product)} title="Tambah Stok" className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50/50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product)} className="text-slate-400 hover:text-destructive hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase italic">View Only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Navigation Footer */}
        {filteredProducts.length > 0 && (
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-slate-500 text-xs font-semibold">
              Menampilkan <span className="font-bold text-slate-800">{(adjustedCurrentPage - 1) * itemsPerPage + 1}</span> sampai{' '}
              <span className="font-bold text-slate-800">{Math.min(filteredProducts.length, adjustedCurrentPage * itemsPerPage)}</span> dari{' '}
              <span className="font-bold text-slate-800">{filteredProducts.length}</span> produk
              {searchTerm && <span className="text-slate-400"> (difilter dari {products.length})</span>}
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={adjustedCurrentPage === 1}
                className="rounded-xl h-9 w-9 p-0 flex items-center justify-center border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - adjustedCurrentPage) <= 1)
                .map((page, index, arr) => {
                  const isGap = index > 0 && page - arr[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {isGap && <span className="text-slate-300 px-1 font-bold text-sm">...</span>}
                      <Button
                        variant={adjustedCurrentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-xl h-9 min-w-9 px-2.5 text-xs font-black transition-all ${
                          adjustedCurrentPage === page
                            ? 'bg-slate-900 text-white shadow-sm hover:bg-black'
                            : 'border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  );
                })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={adjustedCurrentPage === totalPages}
                className="rounded-xl h-9 w-9 p-0 flex items-center justify-center border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="rounded-3xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 -mr-2 scrollbar-thin">
              <div className="flex justify-center mb-4">
                <div 
                  className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden group"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {formData.image ? (
                    <>
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Package className="w-10 h-10 text-slate-300 mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Gambar</span>
                    </>
                  )}
                  <input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-xs font-bold uppercase tracking-wider text-slate-500">Barcode / SKU</Label>
                <div className="flex gap-2">
                  <Input 
                    id="barcode" 
                    value={formData.barcode || ''} 
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                    placeholder="Scan barcode manual..."
                    className="flex-1 rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium font-mono"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 w-12 rounded-xl shrink-0" 
                    onClick={() => setShowScanner(true)}
                  >
                    <Camera className="w-5 h-5 text-slate-500" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Produk</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="Contoh: Nasi Putih"
                  className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori</Label>
                  <Input 
                    id="category" 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                    placeholder="Contoh: Makanan"
                    className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Pembelian</Label>
                  <Input 
                    id="purchaseDate" 
                    type="date"
                    value={formData.purchaseDate} 
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} 
                    className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-xs font-bold uppercase tracking-wider text-slate-500">Stok Barang</Label>
                  <Input 
                    id="stock" 
                    type="number"
                    value={formData.stock} 
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} 
                    placeholder="0"
                    className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="satuan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Satuan</Label>
                  <Input 
                    id="satuan" 
                    value={formData.satuan || ''} 
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value })} 
                    placeholder="Contoh: Pcs, Box, Kg"
                    className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-xs font-bold uppercase tracking-wider text-slate-500">Harga Pembelian (HPP)</Label>
                  <Input 
                    id="costPrice" 
                    type="number" 
                    value={formData.costPrice} 
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })} 
                    placeholder="0"
                    className="rounded-xl border-slate-200 h-12 font-mono text-lg focus-visible:ring-indigo-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-slate-500">Harga Jual (Rp)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} 
                    placeholder="0"
                    className="rounded-xl border-slate-200 h-12 font-mono text-lg focus-visible:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12 font-bold flex-1 border-slate-200">Batal</Button>
              <Button onClick={handleSave} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-100/50 h-12 font-bold flex-1">Simpan Data</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

         <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="rounded-3xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">Hapus Produk?</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-slate-500">
                Apakah Anda yakin ingin menghapus produk <span className="font-bold text-slate-800">"{productToDelete?.name}"</span>? 
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-xl h-12 font-bold flex-1 border-slate-200">Batal</Button>
              <Button variant="destructive" onClick={confirmDelete} className="rounded-xl h-12 font-bold flex-1">Hapus Produk</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
          <DialogContent className="rounded-3xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">Tambah Stok</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 -mr-2 scrollbar-thin">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produk</span>
                  <span className="text-sm font-bold text-slate-800">{productToAddStock?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stok Saat Ini</span>
                  <span className="text-sm font-mono font-bold text-slate-800">{productToAddStock?.stock} {productToAddStock?.satuan || 'Pcs'}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addStockDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Pembelian Baru</Label>
                  <Input 
                    id="addStockDate" 
                    type="date"
                    value={addStockDate} 
                    onChange={(e) => setAddStockDate(e.target.value)} 
                    className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="addStockPrice" className="text-xs font-bold uppercase tracking-wider text-slate-500">Harga Pembelian Terkini (Unit)</Label>
                  <Input 
                    id="addStockPrice" 
                    type="number"
                    value={addStockPrice} 
                    onChange={(e) => setAddStockPrice(Number(e.target.value))} 
                    className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="addStock" className="text-xs font-bold uppercase tracking-wider text-slate-500">Jumlah Stok Tambahan</Label>
                  <Input 
                    id="addStock" 
                    type="number"
                    value={addStockAmount} 
                    onChange={(e) => setAddStockAmount(Math.max(0, Number(e.target.value)))} 
                    placeholder="0"
                    autoFocus
                    className="rounded-xl border-slate-200 h-14 text-2xl font-mono font-bold text-center focus-visible:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-purple-50/40 rounded-2xl border border-purple-100/60">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">Total Biaya Kulakan:</span>
                  <span className="text-sm font-black text-rose-600 font-mono">
                    {formatCurrency(addStockAmount * addStockPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-purple-100">
                  <span className="text-xs font-medium text-slate-500">Total Stok Setelahnya:</span>
                  <span className="text-lg font-black text-purple-600 font-mono">
                    {Number(((productToAddStock?.stock || 0) + addStockAmount).toFixed(4))} {productToAddStock?.satuan || 'Pcs'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsAddStockDialogOpen(false)} className="rounded-xl h-12 font-bold flex-1 border-slate-200">Batal</Button>
              <Button onClick={confirmUpdateStock} className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl shadow-purple-100/40 h-12 font-bold flex-1">Simpan Stok</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scanner Dialog */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                Scan Barcode
              </DialogTitle>
              <DialogDescription>
                Arahkan kamera ke barcode untuk mengisi kolom secara otomatis.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {showScanner && (
                <BarcodeScanner 
                  onScan={(code) => {
                    setFormData({ ...formData, barcode: code });
                    setShowScanner(false);
                    toast.success('Barcode berhasil dipindai');
                  }} 
                  onError={(err) => {
                    console.debug('Scanner issue:', err);
                  }} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
