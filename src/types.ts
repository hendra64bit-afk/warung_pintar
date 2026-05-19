/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  costPrice: number;
  price: number;
  category: string;
  stock: number;
  barcode?: string;
  image?: string;
  purchaseDate?: string;
}

export interface CartItem extends Product {
  quantity: number;
  returnedQuantity?: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  total: number;
  paidAmount: number;
  change: number;
  timestamp: number;
  status?: 'completed' | 'returned';
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  date: string;
  timestamp: number;
}

export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  createdAt: number;
}
