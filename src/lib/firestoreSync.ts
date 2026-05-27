/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { signInAnonymously } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Product, Transaction, PurchaseRecord, User, CashLog, ExpenseRecord } from '../types';
import { storage } from './storage';

export const getTenantPath = (collectionName: string) => {
  const storeId = storage.getActiveStoreId();
  if (!storeId) {
    throw new Error(`Store ID is required for collection: ${collectionName}`);
  }
  return `stores/${storeId}/${collectionName}`;
};

export const getTenantCollection = (collectionName: string) => {
  return collection(db, getTenantPath(collectionName));
};

export const getTenantDoc = (collectionName: string, id: string) => {
  return doc(db, getTenantPath(collectionName), id);
};

/**
 * Autentikasi anonim untuk mengaktifkan validasi keamanan aturan Firestore (request.auth != null)
 */
export async function signInAnonymouslyIfNeeded() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
      console.log('[Firebase] Berhasil login secara anonim untuk sinkronisasi cloud.');
    }
  } catch (error) {
    console.warn('[Firebase] Warning: Gagal menginisiasi sesi cloud anonim:', error);
  }
}

/**
 * Menyimpan atau memperbarui data sediaan Produk ke Firestore Cloud
 */
export async function saveProductToCloud(product: Product) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('products')}/${product.id}`;
  try {
    await setDoc(getTenantDoc('products', product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Menghapus data Produk dari Firestore Cloud
 */
export async function deleteProductFromCloud(productId: string) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('products')}/${productId}`;
  try {
    await deleteDoc(getTenantDoc('products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Memperbarui sekumpulan Produk di Cloud
 */
export async function saveProductsToCloud(products: Product[]) {
  await signInAnonymouslyIfNeeded();
  try {
    for (const p of products) {
      await setDoc(getTenantDoc('products', p.id), p);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products');
  }
}

/**
 * Menyimpan data transaksi kasir ke Firestore Cloud
 */
export async function saveTransactionToCloud(transaction: Transaction) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('transactions')}/${transaction.id}`;
  try {
    await setDoc(getTenantDoc('transactions', transaction.id), transaction);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Menghapus data transaksi kasir dari Firestore Cloud
 */
export async function deleteTransactionFromCloud(transactionId: string) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('transactions')}/${transactionId}`;
  try {
    await deleteDoc(getTenantDoc('transactions', transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Menyimpan rekaman pembelian sediaan ke Firestore Cloud
 */
export async function savePurchaseToCloud(purchase: PurchaseRecord) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('purchases')}/${purchase.id}`;
  try {
    await setDoc(getTenantDoc('purchases', purchase.id), purchase);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Menghapus rekaman pembelian sediaan dari Firestore Cloud
 */
export async function deletePurchaseFromCloud(purchaseId: string) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('purchases')}/${purchaseId}`;
  try {
    await deleteDoc(getTenantDoc('purchases', purchaseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Menyimpan data akun pengguna (kasir/admin) ke Firestore Cloud
 */
export async function saveUserToCloud(user: User) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('users')}/${user.id}`;
  try {
    await setDoc(getTenantDoc('users', user.id), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Menghapus data akun pengguna dari Firestore Cloud
 */
export async function deleteUserFromCloud(userId: string) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('users')}/${userId}`;
  try {
    await deleteDoc(getTenantDoc('users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Memperbarui nama toko general ke Firestore Cloud
 */
export async function saveStoreNameCloud(storeName: string) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('settings')}/general`;
  try {
    await setDoc(getTenantDoc('settings', 'general'), { storeName });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sinkronisasi penuh semua file backup pasca aksi RESTORE
 */
export async function syncAllBackupDataToCloud(data: {
  products: Product[];
  transactions: Transaction[];
  purchases: PurchaseRecord[];
  storeName?: string;
}) {
  await signInAnonymouslyIfNeeded();
  try {
    if (data.storeName) {
      await saveStoreNameCloud(data.storeName);
    }
    if (data.products && Array.isArray(data.products)) {
      for (const p of data.products) {
        await setDoc(getTenantDoc('products', p.id), p);
      }
    }
    if (data.transactions && Array.isArray(data.transactions)) {
      for (const t of data.transactions) {
        await setDoc(getTenantDoc('transactions', t.id), t);
      }
    }
    if (data.purchases && Array.isArray(data.purchases)) {
      for (const pr of data.purchases) {
        await setDoc(getTenantDoc('purchases', pr.id), pr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bulk-restore-sync');
  }
}

/**
 * Menyimpan rekaman cash log (kas masuk/keluar) ke Firestore Cloud
 */
export async function saveCashLogToCloud(cashLog: CashLog) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('cashlogs')}/${cashLog.id}`;
  try {
    await setDoc(getTenantDoc('cashlogs', cashLog.id), cashLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Menghapus rekaman cash log dari Firestore Cloud
 */
export async function deleteCashLogFromCloud(cashLogId: string) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('cashlogs')}/${cashLogId}`;
  try {
    await deleteDoc(getTenantDoc('cashlogs', cashLogId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Menyimpan rekaman pengeluaran beban sediaan/operasional ke Firestore Cloud
 */
export async function saveExpenseToCloud(expense: ExpenseRecord) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('expenses')}/${expense.id}`;
  try {
    await setDoc(getTenantDoc('expenses', expense.id), expense);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Menghapus rekaman pengeluaran beban dari Firestore Cloud
 */
export async function deleteExpenseFromCloud(expenseId: string) {
  await signInAnonymouslyIfNeeded();
  const path = `${getTenantPath('expenses')}/${expenseId}`;
  try {
    await deleteDoc(getTenantDoc('expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
