/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Transaction } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { storage } from '@/src/lib/storage';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { parseISO } from 'date-fns';

interface ReceiptViewProps {
  transaction: Transaction;
}

export default function ReceiptView({ transaction }: ReceiptViewProps) {
  const timestamp = typeof transaction.timestamp === 'string' 
    ? parseISO(transaction.timestamp) 
    : new Date(transaction.timestamp);

  const storeName = storage.getStoreName();

  return (
    <div className="bg-white p-8 max-w-[400px] mx-auto text-slate-800 font-mono text-[12px] leading-tight" id="receipt-content">
      <div className="text-center mb-6 space-y-1">
        <h1 className="text-lg font-black uppercase tracking-tighter">{storeName}</h1>
        <p className="text-[10px] opacity-70">Jln. Kebahagiaan No. 88, Jakarta</p>
        <p className="text-[10px] opacity-70">Telp: 0812-3456-7890</p>
      </div>

      <div className="border-t border-dashed border-slate-300 py-3 space-y-1">
        <div className="flex justify-between">
          <span>TANGGAL:</span>
          <span>{format(timestamp, 'dd/MM/yyyy HH:mm', { locale: id })}</span>
        </div>
        <div className="flex justify-between">
          <span>STRUK:</span>
          <span className="font-bold">#{transaction.id.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>KASIR:</span>
          <span>ADMIN</span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 py-3">
        <div className="space-y-2">
          {transaction.items.map((item, idx) => {
            const netQuantity = item.quantity - (item.returnedQuantity || 0);
            if (netQuantity <= 0) return null;
            
            return (
              <div key={idx} className="space-y-1">
                <div className="font-bold uppercase">{item.name}</div>
                <div className="flex justify-between pl-2">
                  <span>{netQuantity} x {formatCurrency(item.price)}</span>
                  <span>{formatCurrency(item.price * netQuantity)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 py-3 space-y-1">
        <div className="flex justify-between pt-1">
          <span>SUBTOTAL</span>
          <span>{formatCurrency(transaction.subtotal)}</span>
        </div>
        {transaction.discountValue && transaction.discountValue > 0 && (
          <div className="flex justify-between">
            <span>DISKON ({transaction.discountType === 'percentage' ? `${transaction.discountValue}%` : 'RP'})</span>
            <span>-{formatCurrency(transaction.total - transaction.subtotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-black pt-2 border-t border-slate-200 mt-2">
          <span>TOTAL</span>
          <span>{formatCurrency(transaction.total)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 py-3 space-y-1">
        <div className="flex justify-between">
          <span>TUNAI</span>
          <span>{formatCurrency(transaction.paidAmount || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>KEMBALI</span>
          <span>{formatCurrency(transaction.change || 0)}</span>
        </div>
      </div>

      <div className="text-center mt-8 space-y-2">
        <div className="text-[10px] font-bold">*** TERIMA KASIH ***</div>
        <p className="text-[8px] opacity-50 uppercase tracking-widest">Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan</p>
      </div>
    </div>
  );
}
