/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Transaction, PurchaseRecord, User } from '../types';

const PRODUCTS_KEY = 'warung-pintar-products';
const TRANSACTIONS_KEY = 'warung-pintar-transactions';
const PURCHASES_KEY = 'warung-pintar-purchases';
const PASSWORD_KEY = 'warung-pintar-password';
const STORE_NAME_KEY = 'warung-pintar-store-name';
const USERS_KEY = 'warung-pintar-users';

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

export const storage = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem(PRODUCTS_KEY);
    return data ? JSON.parse(data) : DEFAULT_PRODUCTS;
  },
  saveProducts: (products: Product[]) => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  },
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveTransaction: (transaction: Transaction) => {
    const transactions = storage.getTransactions();
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([transaction, ...transactions]));
  },
  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  },
  clearTransactions: () => {
    localStorage.removeItem(TRANSACTIONS_KEY);
  },
  getPurchases: (): PurchaseRecord[] => {
    const data = localStorage.getItem(PURCHASES_KEY);
    return data ? JSON.parse(data) : [];
  },
  savePurchase: (purchase: PurchaseRecord) => {
    const purchases = storage.getPurchases();
    localStorage.setItem(PURCHASES_KEY, JSON.stringify([purchase, ...purchases]));
  },
  savePurchases: (purchases: PurchaseRecord[]) => {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
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
    if (data.transactions) localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(data.transactions));
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
    return localStorage.getItem(STORE_NAME_KEY) || DEFAULT_STORE_NAME;
  },
  setStoreName: (name: string) => {
    localStorage.setItem(STORE_NAME_KEY, name);
  },
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : DEFAULT_USERS;
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },
  login: (username: string, password: string): User | null => {
    const users = storage.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      // Don't return password in the session object
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    return null;
  }
};
