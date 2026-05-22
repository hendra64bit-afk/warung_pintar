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

// Firebase Firestore Imports
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testFirestoreConnection } from '@/src/lib/firebase';
import { 
  signInAnonymouslyIfNeeded, 
  saveProductToCloud, 
  deleteProductFromCloud, 
  saveProductsToCloud,
  saveTransactionToCloud, 
  deleteTransactionFromCloud, 
  savePurchaseToCloud, 
  deletePurchaseFromCloud,
  saveStoreNameCloud,
  getTenantCollection,
  getTenantDoc
} from '@/src/lib/firestoreSync';

interface PosAppProps {
  currentUser: User;
  onLogout: () => void;
}

export default function PosApp({ currentUser, onLogout }: PosAppProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [storeNameState, setStoreNameState] = useState(storage.getStoreName());
  const [dbConnected, setDbConnected] = useState<boolean>(navigator.onLine);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const handleOnline = () => setDbConnected(true);
    const handleOffline = () => setDbConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // 1. Ambil data lokal instan sebagai cache awal (offline-first)
    setProducts(storage.getProducts());
    setTransactions(storage.getTransactions());
    setPurchases(storage.getPurchases());

    // 2. Inisiasi proses sinkronisasi real-time dengan cloud Firestore
    let unsubProducts: () => void;
    let unsubTransactions: () => void;
    let unsubPurchases: () => void;
    let unsubSettings: () => void;
    let unsubUsers: () => void;

    const startSync = async () => {
      try {
        await signInAnonymouslyIfNeeded();
        await testFirestoreConnection();

        // Real-time listener produk
        unsubProducts = onSnapshot(getTenantCollection('products'), (snapshot) => {
          setDbConnected(true);
          const cloudProducts: Product[] = [];
          snapshot.forEach((doc) => {
            cloudProducts.push(doc.data() as Product);
          });
          if (cloudProducts.length > 0) {
            setProducts(cloudProducts);
            storage.saveProducts(cloudProducts);
          } else {
            // Jika cloud masih kosong, unggah data default lokal
            const defaults = storage.getProducts();
            saveProductsToCloud(defaults);
          }
        }, (error) => {
          setDbConnected(false);
          try { handleFirestoreError(error, OperationType.GET, 'products'); } catch (e) { console.error('Error fetching products', e); }
        });

        // Real-time listener transaksi
        unsubTransactions = onSnapshot(getTenantCollection('transactions'), (snapshot) => {
          setDbConnected(true);
          const cloudTx: Transaction[] = [];
          snapshot.forEach((doc) => {
            cloudTx.push(doc.data() as Transaction);
          });
          cloudTx.sort((a, b) => b.timestamp - a.timestamp);
          setTransactions(cloudTx);
          storage.saveTransactions(cloudTx);
        }, (error) => {
          setDbConnected(false);
          try { handleFirestoreError(error, OperationType.GET, 'transactions'); } catch (e) { console.error('Error fetching transactions', e); }
        });

        // Real-time listener pembelian sediaan
        unsubPurchases = onSnapshot(getTenantCollection('purchases'), (snapshot) => {
          setDbConnected(true);
          const cloudPur: PurchaseRecord[] = [];
          snapshot.forEach((doc) => {
            cloudPur.push(doc.data() as PurchaseRecord);
          });
          cloudPur.sort((a, b) => b.timestamp - a.timestamp);
          setPurchases(cloudPur);
          storage.savePurchases(cloudPur);
        }, (error) => {
          setDbConnected(false);
          try { handleFirestoreError(error, OperationType.GET, 'purchases'); } catch (e) { console.error('Error fetching purchases', e); }
        });

        // Real-time listener nama toko
        unsubSettings = onSnapshot(getTenantDoc('settings', 'general'), (snapshot) => {
          setDbConnected(true);
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && data.storeName) {
              storage.setStoreName(data.storeName);
              setStoreNameState(data.storeName);
            }
          } else {
            const localName = storage.getStoreName();
            saveStoreNameCloud(localName);
          }
        }, (error) => {
          setDbConnected(false);
          try { handleFirestoreError(error, OperationType.GET, 'settings/general'); } catch (e) { console.error('Error fetching settings', e); }
        });

        // Real-time listener sinkronisasi akun pengguna
        unsubUsers = onSnapshot(getTenantCollection('users'), (snapshot) => {
          setDbConnected(true);
          const cloudUsers: User[] = [];
          snapshot.forEach((doc) => {
            cloudUsers.push(doc.data() as User);
          });
          if (cloudUsers.length > 0) {
            storage.saveUsers(cloudUsers);
          } else {
            const defaults = storage.getUsers();
            for (const u of defaults) {
              setDoc(getTenantDoc('users', u.id), u);
            }
          }
        }, (error) => {
          setDbConnected(false);
          try { handleFirestoreError(error, OperationType.GET, 'users'); } catch (e) { console.error('Error fetching users', e); }
        });
      } catch (err) {
        console.warn('[Firebase Sync Error] Tidak dapat melakukan inisialisasi sync:', err);
      }
    };

    startSync();

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubTransactions) unsubTransactions();
      if (unsubPurchases) unsubPurchases();
      if (unsubSettings) unsubSettings();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const handleUpdateProducts = async (newProducts: Product[]) => {
    // Determine deleted products
    const existingProducts = storage.getProducts();
    const deletedProductIds = existingProducts
      .filter(ep => !newProducts.some(np => np.id === ep.id))
      .map(ep => ep.id);

    setProducts(newProducts);
    storage.saveProducts(newProducts);

    // Sync cloud writes asynchronously
    await saveProductsToCloud(newProducts);
    for (const deleteId of deletedProductIds) {
      await deleteProductFromCloud(deleteId);
    }
  };

  const handleAddPurchase = async (purchase: PurchaseRecord) => {
    const newPurchases = [purchase, ...purchases];
    setPurchases(newPurchases);
    storage.savePurchase(purchase);

    // Sync cloud write asynchronously
    await savePurchaseToCloud(purchase);
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if (!purchaseToDelete) return;

    const newPurchases = purchases.filter(p => p.id !== purchaseId);
    setPurchases(newPurchases);
    storage.savePurchases(newPurchases);

    // Sync cloud delete asynchronously
    await deletePurchaseFromCloud(purchaseId);

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

    await handleUpdateProducts(updatedProducts);
    toast.info('Riwayat dihapus, stok dan HPP rata-rata diperbarui.');
  };

  const handleCompleteTransaction = async (transaction: Transaction) => {
    storage.saveTransaction(transaction);
    setTransactions([transaction, ...transactions]);

    // Sync cloud transaction write asynchronously
    await saveTransactionToCloud(transaction);
    
    // Deduct stock
    const updatedProducts = products.map(p => {
      const cartItem = transaction.items.find(item => item.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    });
    
    await handleUpdateProducts(updatedProducts);
    setCart([]);
    toast.success('Transaksi Berhasil!');
  };

  const handleDeleteTransaction = async (transactionId: string) => {
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

    // Sync cloud transaction delete asynchronously
    await deleteTransactionFromCloud(transactionId);
    
    await handleUpdateProducts(updatedProducts);
    toast.info('Transaksi telah dihapus dan stok dikembalikan.');
  };

  const handleBatchReturn = async (transactionId: string, itemsToReturn: { productId: string, quantity: number }[]) => {
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

    // Sync Cloud transaction modification asynchronously
    const targetTx = updatedTransactions.find(t => t.id === transactionId);
    if (targetTx) {
      await saveTransactionToCloud(targetTx);
    }

    await handleUpdateProducts(updatedProducts);
    
    const totalQty = itemsToReturn.reduce((sum, item) => sum + item.quantity, 0);
    toast.success(`Berhasil retur ${totalQty} unit produk.`);
  };

  const refreshData = () => {
    setProducts(storage.getProducts());
    setTransactions(storage.getTransactions());
    setPurchases(storage.getPurchases());
    setStoreNameState(storage.getStoreName());
    setCart([]);
  };

  const storeName = storeNameState;

  return (
    <div className="h-screen w-full p-2 md:p-6 lg:p-8 flex flex-col overflow-hidden relative">
      {/* Decorative window frame */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white/75 backdrop-blur-3xl rounded-[3rem] shadow-2xl shadow-indigo-900/5 border border-white/80 relative">
        
        {/* macOS Desktop Window Header */}
        <header className="bg-white/50 border-b border-slate-100/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/80 shadow-sm border border-red-500/10" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80 shadow-sm border border-amber-500/10" />
              <div className="w-3 h-3 rounded-full bg-green-400/80 shadow-sm border border-green-500/10" />
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-none">{storeName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">POS v2.0</span>
                  <span className="text-slate-300 select-none leading-none">•</span>
                  {dbConnected ? (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase tracking-wider leading-none">
                      ONLINE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase tracking-wider leading-none animate-pulse">
                      OFFLINE
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2 text-right">
              <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-tighter">{currentUser.role === 'admin' ? 'Administrator' : 'Kasir'}</span>
            </div>
            <div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden backdrop-blur-md">
              <UserIcon className="w-4 h-4 text-slate-400" />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onLogout}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <Tabs defaultValue="cashier" className="flex-1 flex flex-col min-h-0">
          <div className="bg-white/20 border-b border-slate-100/80 px-6 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="h-14 bg-transparent gap-6 md:gap-8 w-max min-w-full justify-start items-center flex-nowrap">
            <TabsTrigger 
              value="cashier" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-blue-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Kasir
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-blue-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
            >
              <Package className="w-4 h-4 mr-2" />
              Produk
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-blue-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
            >
              <HistoryIcon className="w-4 h-4 mr-2" />
              Penjualan
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger 
                  value="purchases" 
                  className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-purple-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Pembelian
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-purple-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Laporan
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-analysis" 
                  className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-purple-600 font-bold text-xs uppercase tracking-widest transition-all px-0"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-purple-500 animate-pulse" />
                  Analisa AI
                </TabsTrigger>
              </>
            )}
            <TabsTrigger 
              value="settings" 
              className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-slate-800 font-bold text-xs uppercase tracking-widest transition-all px-0 ml-auto"
            >
              <Settings className="w-4 h-4 mr-2" />
              Pengaturan
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
    </div>
  );
}
