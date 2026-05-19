/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Package, PlusCircle } from 'lucide-react';
import { Product, PurchaseRecord } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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
  const [addStockAmount, setAddStockAmount] = useState<number>(0);
  const [addStockPrice, setAddStockPrice] = useState<number>(0);
  const [addStockDate, setAddStockDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<Partial<Product>>({});

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      costPrice: 0, 
      price: 0, 
      category: 'Lain-lain', 
      stock: 0, 
      image: '',
      purchaseDate: new Date().toISOString().split('T')[0]
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

    const payload = { ...formData };

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
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-6 px-8">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Manajemen Produk</CardTitle>
            <p className="text-slate-500 text-sm mt-1">Daftar item yang tersedia di toko</p>
          </div>
          {isAdmin && (
            <Button onClick={handleAdd} className="rounded-xl flex items-center gap-2 bg-slate-900 hover:bg-black font-bold text-xs uppercase tracking-wider h-10 px-6">
              <Plus className="w-4 h-4" />
              Produk Baru
            </Button>
          )}
        </CardHeader>
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
              {products.map((product) => (
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
                      {product.stock}
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
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
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
              ))}
            </TableBody>
          </Table>
        </CardContent>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="rounded-3xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-6">
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
                <Input 
                  id="barcode" 
                  value={formData.barcode || ''} 
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                  placeholder="Scan barcode atau masukkan SKU..."
                  className="rounded-xl border-slate-200 h-12 focus-visible:ring-indigo-600 font-medium font-mono"
                />
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
              <Button onClick={handleSave} className="rounded-xl bg-slate-900 hover:bg-black h-12 font-bold flex-1">Simpan Data</Button>
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
            <div className="space-y-4 py-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produk</span>
                  <span className="text-sm font-bold text-slate-800">{productToAddStock?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stok Saat Ini</span>
                  <span className="text-sm font-mono font-bold text-slate-800">{productToAddStock?.stock}</span>
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
                    className="rounded-xl border-slate-200 h-14 text-2xl font-mono font-bold text-center focus-visible:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">Total Biaya Kulakan:</span>
                  <span className="text-sm font-black text-rose-600 font-mono">
                    {formatCurrency(addStockAmount * addStockPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                  <span className="text-xs font-medium text-slate-500">Total Stok Setelahnya:</span>
                  <span className="text-lg font-black text-indigo-600 font-mono">
                    {(productToAddStock?.stock || 0) + addStockAmount}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsAddStockDialogOpen(false)} className="rounded-xl h-12 font-bold flex-1 border-slate-200">Batal</Button>
              <Button onClick={confirmUpdateStock} className="rounded-xl bg-slate-900 hover:bg-black h-12 font-bold flex-1">Simpan Stok</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
