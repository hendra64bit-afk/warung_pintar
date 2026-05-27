/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Transaction, PurchaseRecord, User, CashLog, ExpenseRecord } from '../types';

const PRODUCTS_KEY = 'warung-pintar-products';
const TRANSACTIONS_KEY = 'warung-pintar-transactions';
const PURCHASES_KEY = 'warung-pintar-purchases';
const PASSWORD_KEY = 'warung-pintar-password';
const STORE_NAME_KEY = 'warung-pintar-store-name';
const USERS_KEY = 'warung-pintar-users';
const CASH_LOGS_KEY = 'warung-pintar-cashlogs';
const EXPENSES_KEY = 'warung-pintar-expenses';

const DEFAULT_USERS: User[] = [
  {
    id: 'admin_1',
    username: 'admin',
    password: 'password123',
    name: 'Administrator',
    role: 'admin',
    createdAt: Date.now()
  }
];

const DEFAULT_STORE_NAME = 'WARUNG PINTAR';
const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'Nasi Goreng', costPrice: 10000, price: 15000, category: 'Makanan', stock: 50 },
  { id: '2', name: 'Ayam Bakar', costPrice: 15000, price: 20000, category: 'Makanan', stock: 30 },
  { id: '3', name: 'Es Teh Manis', costPrice: 2000, price: 5000, category: 'Minuman', stock: 100 },
  { id: '4', name: 'Kopi Hitam', costPrice: 3000, price: 7000, category: 'Minuman', stock: 100 },
  { id: '5', name: 'Gorengan (Bakwan)', costPrice: 1000, price: 2000, category: 'Snack', stock: 200 },
];

const getStoreKey = (baseKey: string) => {
  const storeId = storage.getActiveStoreId();
  return storeId ? `${storeId}-${baseKey}` : baseKey;
};

export const storage = {
  getRecentStores: (): string[] => {
    const data = localStorage.getItem('warung-pintar-recent-stores');
    return data ? JSON.parse(data) : [];
  },
  addRecentStore: (storeId: string) => {
    const stores = storage.getRecentStores();
    if (!stores.includes(storeId)) {
      stores.push(storeId);
      localStorage.setItem('warung-pintar-recent-stores', JSON.stringify(stores));
    }
  },
  getActiveStoreId: (): string | null => {
    return localStorage.getItem('warung-pintar-active-store-id');
  },
  setActiveStoreId: (storeId: string | null) => {
    if (storeId) {
      localStorage.setItem('warung-pintar-active-store-id', storeId);
    } else {
      localStorage.removeItem('warung-pintar-active-store-id');
    }
  },
  getProducts: (): Product[] => {
    const data = localStorage.getItem(getStoreKey(PRODUCTS_KEY));
    return data ? JSON.parse(data) : DEFAULT_PRODUCTS;
  },
  saveProducts: (products: Product[]) => {
    localStorage.setItem(getStoreKey(PRODUCTS_KEY), JSON.stringify(products));
  },
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(getStoreKey(TRANSACTIONS_KEY));
    return data ? JSON.parse(data) : [];
  },
  saveTransaction: (transaction: Transaction) => {
    const transactions = storage.getTransactions();
    localStorage.setItem(getStoreKey(TRANSACTIONS_KEY), JSON.stringify([transaction, ...transactions]));
  },
  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(getStoreKey(TRANSACTIONS_KEY), JSON.stringify(transactions));
  },
  clearTransactions: () => {
    localStorage.removeItem(getStoreKey(TRANSACTIONS_KEY));
  },
  getPurchases: (): PurchaseRecord[] => {
    const data = localStorage.getItem(getStoreKey(PURCHASES_KEY));
    return data ? JSON.parse(data) : [];
  },
  savePurchase: (purchase: PurchaseRecord) => {
    const purchases = storage.getPurchases();
    localStorage.setItem(getStoreKey(PURCHASES_KEY), JSON.stringify([purchase, ...purchases]));
  },
  savePurchases: (purchases: PurchaseRecord[]) => {
    localStorage.setItem(getStoreKey(PURCHASES_KEY), JSON.stringify(purchases));
  },
  getCashLogs: (): CashLog[] => {
    const data = localStorage.getItem(getStoreKey(CASH_LOGS_KEY));
    return data ? JSON.parse(data) : [];
  },
  saveCashLog: (cashLog: CashLog) => {
    const logs = storage.getCashLogs();
    localStorage.setItem(getStoreKey(CASH_LOGS_KEY), JSON.stringify([cashLog, ...logs]));
  },
  saveCashLogs: (cashLogs: CashLog[]) => {
    localStorage.setItem(getStoreKey(CASH_LOGS_KEY), JSON.stringify(cashLogs));
  },
  clearCashLogs: () => {
    localStorage.removeItem(getStoreKey(CASH_LOGS_KEY));
  },
  getExpenses: (): ExpenseRecord[] => {
    const data = localStorage.getItem(getStoreKey(EXPENSES_KEY));
    return data ? JSON.parse(data) : [];
  },
  saveExpense: (expense: ExpenseRecord) => {
    const expenses = storage.getExpenses();
    localStorage.setItem(getStoreKey(EXPENSES_KEY), JSON.stringify([expense, ...expenses]));
  },
  saveExpenses: (expenses: ExpenseRecord[]) => {
    localStorage.setItem(getStoreKey(EXPENSES_KEY), JSON.stringify(expenses));
  },
  clearExpenses: () => {
    localStorage.removeItem(getStoreKey(EXPENSES_KEY));
  },
  exportData: () => {
    return {
      products: storage.getProducts(),
      transactions: storage.getTransactions(),
      purchases: storage.getPurchases(),
      storeName: storage.getStoreName(),
    };
  },
  importData: (data: { products: Product[], transactions: Transaction[], purchases: PurchaseRecord[], storeName?: string }) => {
    if (data.products) storage.saveProducts(data.products);
    if (data.transactions) localStorage.setItem(getStoreKey(TRANSACTIONS_KEY), JSON.stringify(data.transactions));
    if (data.purchases) storage.savePurchases(data.purchases);
    if (data.storeName) storage.setStoreName(data.storeName);
  },
  getPassword: (): string | null => {
    return localStorage.getItem(PASSWORD_KEY);
  },
  setPassword: (password: string | null) => {
    if (password === null) {
      localStorage.removeItem(PASSWORD_KEY);
    } else {
      localStorage.setItem(PASSWORD_KEY, password);
    }
  },
  getStoreName: (): string => {
    return localStorage.getItem(getStoreKey(STORE_NAME_KEY)) || DEFAULT_STORE_NAME;
  },
  setStoreName: (name: string) => {
    localStorage.setItem(getStoreKey(STORE_NAME_KEY), name);
  },
  getUsers: (): User[] => {
    const data = localStorage.getItem(getStoreKey(USERS_KEY));
    return data ? JSON.parse(data) : DEFAULT_USERS;
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(getStoreKey(USERS_KEY), JSON.stringify(users));
  },
  login: (storeId: string, username: string, password: string): User | null => {
    storage.setActiveStoreId(storeId);
    const users = storage.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      // Don't return password in the session object
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    // If login failed, remove active store id
    storage.setActiveStoreId(null);
    return null;
  }
};
