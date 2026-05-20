/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, History as HistoryIcon, BarChart3, LogOut, ArrowDownRight, Settings, User as UserIcon, Sparkles } from 'lucide-react';
import { storage } from '@/src/lib/storage';
import { Product, CartItem, Transaction, PurchaseRecord, User } from '@/src/types';
import CashierTab from './CashierTab';
import ProductTab from './ProductTab';
import HistoryTab from './HistoryTab';
import ReportTab from './ReportTab';
import PurchaseHistoryTab from './PurchaseHistoryTab';
import SettingsTab from './SettingsTab';
import AiAnalysisTab from './AiAnalysisTab';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface PosAppProps {
  currentUser: User;
  onLogout: () => void;
}

export default function PosApp({ currentUser, onLogout }: PosAppProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    setProducts(storage.getProducts());
    setTransactions(storage.getTransactions());
    setPurchases(storage.getPurchases());
  }, []);

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    storage.saveProducts(newProducts);
  };

  const handleAddPurchase = (purchase: PurchaseRecord) => {
    const newPurchases = [purchase, ...purchases];
    setPurchases(newPurchases);
    storage.savePurchase(purchase);
  };

  const handleDeletePurchase = (purchaseId: string) => {
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if (!purchaseToDelete) return;

    const newPurchases = purchases.filter(p => p.id !== purchaseId);
    setPurchases(newPurchases);
    storage.savePurchases(newPurchases);

    // Recalculate average cost for the product based on remaining records
    // This provides the most consistent "average" after a deletion
    const productPurchases = newPurchases.filter(p => p.productId === purchaseToDelete.productId);
    
    const updatedProducts = products.map(p => {
      if (p.id === purchaseToDelete.productId) {
        const totalQtyHistory = productPurchases.reduce((sum, pr) => sum + pr.quantity, 0);
        const totalValueHistory = productPurchases.reduce((sum, pr) => sum + (pr.quantity * pr.costPrice), 0);
        
        const newAvg = totalQtyHistory > 0 
          ? totalValueHistory / totalQtyHistory 
          : p.costPrice;

        return { 
          ...p, 
          stock: Math.max(0, p.stock - purchaseToDelete.quantity),
          costPrice: Math.round(newAvg)
        };
      }
      return p;
    });

    handleUpdateProducts(updatedProducts);
    toast.info('Riwayat dihapus, stok dan HPP rata-rata diperbarui.');
  };

  const handleCompleteTransaction = (transaction: Transaction) => {
    storage.saveTransaction(transaction);
    setTransactions([transaction, ...transactions]);
    
    // Deduct stock
    const updatedProducts = products.map(p => {
      const cartItem = transaction.items.find(item => item.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    });
    
    handleUpdateProducts(updatedProducts);
    setCart([]);
    toast.success('Transaksi Berhasil!');
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (!transactionToDelete) return;

    // Restore stock
    const updatedProducts = products.map(p => {
      const itemToRestore = transactionToDelete.items.find(item => item.id === p.id);
      if (itemToRestore) {
        return { ...p, stock: p.stock + itemToRestore.quantity };
      }
      return p;
    });

    const newTransactions = transactions.filter(t => t.id !== transactionId);
    setTransactions(newTransactions);
    storage.saveTransactions(newTransactions);
    handleUpdateProducts(updatedProducts);
    
    toast.info('Transaksi telah dihapus dan stok dikembalikan.');
  };

  const handleBatchReturn = (transactionId: string, itemsToReturn: { productId: string, quantity: number }[]) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction || itemsToReturn.length === 0) return;

    // Update Transaction Items and Totals
    const updatedTransactions = transactions.map(t => {
      if (t.id === transactionId) {
        let returnSubtotalValue = 0;
        
        const updatedItems = t.items.map(item => {
          const returnEntry = itemsToReturn.find(r => r.productId === item.id);
          if (returnEntry) {
            const currentReturned = item.returnedQuantity || 0;
            const canReturn = item.quantity - currentReturned;
            const actualToReturn = Math.min(canReturn, returnEntry.quantity);
            
            returnSubtotalValue += actualToReturn * item.price;
            
            return { ...item, returnedQuantity: currentReturned + actualToReturn };
          }
          return item;
        });

        const newSubtotal = Math.max(0, t.subtotal - returnSubtotalValue);
        let newTotal = newSubtotal;

        if (t.discountType === 'percentage' && t.discountValue) {
          newTotal = newSubtotal * (1 - t.discountValue / 100);
        } else if (t.discountType === 'amount' && t.discountValue) {
          newTotal = Math.max(0, newSubtotal - t.discountValue);
        }

        // Check if all items are fully returned
        const allReturned = updatedItems.every(item => (item.returnedQuantity || 0) >= item.quantity);
        
        return { 
          ...t, 
          items: updatedItems,
          subtotal: newSubtotal,
          total: Math.round(newTotal),
          change: Math.max(0, Math.round(t.paidAmount - newTotal)),
          status: allReturned ? 'returned' as const : t.status
        } as Transaction;
      }
      return t;
    });

    // Restore Stock to Products
    const updatedProducts = products.map(p => {
      const returnEntry = itemsToReturn.find(r => r.productId === p.id);
      if (returnEntry) {
        return { ...p, stock: p.stock + returnEntry.quantity };
      }
      return p;
    });

    setTransactions(updatedTransactions);
    storage.saveTransactions(updatedTransactions);
    handleUpdateProducts(updatedProducts);
    
    const totalQty = itemsToReturn.reduce((sum, item) => sum + item.quantity, 0);
    toast.success(`Berhasil retur ${totalQty} unit produk.`);
  };

  const refreshData = () => {
    setProducts(storage.getProducts());
    setTransactions(storage.getTransactions());
    setPurchases(storage.getPurchases());
    setCart([]);
  };

  const storeName = storage.getStoreName();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">{storeName}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Kasir v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2 text-right">
            <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-tighter">{currentUser.role === 'admin' ? 'Administrator' : 'Kasir'}</span>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
            <UserIcon className="w-5 h-5 text-slate-400" />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onLogout}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="cashier" className="flex-1 flex flex-col min-h-0">
        <div className="bg-white border-b border-slate-200 px-6 shrink-0">
          <TabsList className="h-14 bg-transparent gap-8">
            <TabsTrigger 
              value="cashier" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Kasir
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
            >
              <Package className="w-4 h-4 mr-2" />
              Produk
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
            >
              <HistoryIcon className="w-4 h-4 mr-2" />
              Penjualan
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger 
                  value="purchases" 
                  className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Pembelian
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Laporan
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-analysis" 
                  className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-indigo-500 animate-pulse" />
                  Analisa AI
                </TabsTrigger>
              </>
            )}
            <TabsTrigger 
              value="settings" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all px-0 ml-auto"
            >
              <Settings className="w-4 h-4 mr-2" />
              Pengaturan
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="cashier" className="min-h-full m-0 outline-none">
            <CashierTab 
              products={products} 
              transactions={transactions}
              onComplete={handleCompleteTransaction}
              cart={cart}
              setCart={setCart}
            />
          </TabsContent>
          
          <TabsContent value="products" className="min-h-full m-0 outline-none">
            <ProductTab 
              products={products} 
              onUpdateProducts={handleUpdateProducts}
              onAddPurchase={handleAddPurchase}
              isAdmin={isAdmin}
            />
          </TabsContent>
          
          <TabsContent value="history" className="min-h-full m-0 outline-none">
            <HistoryTab 
              transactions={transactions} 
              onDelete={handleDeleteTransaction}
              onReturnBatch={handleBatchReturn}
              isAdmin={isAdmin}
            />
          </TabsContent>
          
          {isAdmin && (
            <>
              <TabsContent value="purchases" className="min-h-full m-0 outline-none">
                <PurchaseHistoryTab 
                  purchases={purchases} 
                  onDelete={handleDeletePurchase}
                />
              </TabsContent>

              <TabsContent value="reports" className="min-h-full m-0 outline-none">
                <ReportTab transactions={transactions} />
              </TabsContent>

              <TabsContent value="ai-analysis" className="min-h-full m-0 outline-none">
                <AiAnalysisTab products={products} transactions={transactions} />
              </TabsContent>
            </>
          )}

          <TabsContent value="settings" className="min-h-full m-0 outline-none">
            <SettingsTab onRefresh={refreshData} currentUser={currentUser} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
