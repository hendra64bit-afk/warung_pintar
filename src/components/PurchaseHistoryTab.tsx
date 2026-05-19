/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PurchaseRecord } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { Calendar, Trash2, ArrowDownRight, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PurchaseHistoryTabProps {
  purchases: PurchaseRecord[];
  onDelete: (id: string) => void;
}

export default function PurchaseHistoryTab({ purchases, onDelete }: PurchaseHistoryTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = dateFilter === '' || p.date === dateFilter;
      const matchesMonth = monthFilter === '' || p.date.startsWith(monthFilter);
      return matchesSearch && matchesDate && matchesMonth;
    });
  }, [purchases, searchTerm, dateFilter, monthFilter]);

  const stats = useMemo(() => {
    const totalItems = filteredPurchases.reduce((sum, p) => sum + p.quantity, 0);
    const totalCost = filteredPurchases.reduce((sum, p) => sum + p.totalCost, 0);
    return { totalItems, totalCost };
  }, [filteredPurchases]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Item Dibeli</p>
            <h4 className="text-2xl font-black text-slate-800">{stats.totalItems} unit</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Pengeluaran</p>
            <h4 className="text-2xl font-black text-rose-600">{formatCurrency(stats.totalCost)}</h4>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="border-b bg-slate-50/50 py-6 px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Riwayat Pembelian Produk</CardTitle>
            <p className="text-slate-500 text-sm mt-1">Daftar pengadaan stok barang</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input 
                placeholder="Cari produk..." 
                className="pl-9 h-10 w-full sm:w-64 rounded-xl border-slate-200 focus-visible:ring-indigo-600 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Input 
                type="month"
                className="h-10 w-full sm:w-auto rounded-xl border-slate-200 focus-visible:ring-indigo-600 font-medium"
                title="Filter Bulan"
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  if (e.target.value) setDateFilter(''); // Clear day filter when month is selected
                }}
              />
              {monthFilter && (
                <button 
                  onClick={() => setMonthFilter('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="relative">
              <Input 
                type="date"
                className="h-10 w-full sm:w-auto rounded-xl border-slate-200 focus-visible:ring-indigo-600 font-medium"
                title="Filter Tanggal"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value) setMonthFilter(''); // Clear month filter when day is selected
                }}
              />
              {dateFilter && (
                <button 
                  onClick={() => setDateFilter('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-200">
                <TableHead className="pl-8 font-bold text-xs uppercase text-slate-500">Tanggal</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500">Nama Produk</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Jumlah</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Harga Beli</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Total Biaya</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-slate-500">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic">
                    {searchTerm || dateFilter || monthFilter ? 'Tidak ada hasil filter' : 'Belum ada riwayat pembelian'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                    <TableCell className="pl-8 text-xs font-bold text-slate-600">{purchase.date}</TableCell>
                    <TableCell className="font-bold text-slate-900">{purchase.productName}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-700">+{purchase.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-slate-500">{formatCurrency(purchase.costPrice)}</TableCell>
                    <TableCell className="text-right font-mono font-black text-rose-600">{formatCurrency(purchase.totalCost)}</TableCell>
                    <TableCell className="text-center">
                      <Dialog open={isDeleteDialogOpen && selectedId === purchase.id} onOpenChange={(open) => {
                        setIsDeleteDialogOpen(open);
                        if (!open) setSelectedId(null);
                      }}>
                        <DialogTrigger 
                          render={
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors h-8 w-8"
                              onClick={() => setSelectedId(purchase.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-slate-800 font-bold">Hapus Riwayat?</DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">
                              Yakin ingin menghapus catatan pembelian ini? Tindakan ini hanya menghapus Riwayat, tidak mengurangi stok barang saat ini.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 border-y border-slate-100 flex flex-col gap-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-400 uppercase tracking-widest">Produk</span>
                              <span className="font-bold text-slate-800">{purchase.productName}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-400 uppercase tracking-widest">Total Biaya</span>
                              <span className="font-black text-rose-600">{formatCurrency(purchase.totalCost)}</span>
                            </div>
                          </div>
                          <DialogFooter className="flex flex-row gap-3 sm:justify-end">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsDeleteDialogOpen(false)}
                              className="flex-1 sm:flex-none rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-wider h-10 px-6"
                            >
                              Batal
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => {
                                onDelete(purchase.id);
                                setIsDeleteDialogOpen(false);
                              }}
                              className="flex-1 sm:flex-none rounded-xl bg-red-600 hover:bg-red-700 font-bold text-[10px] uppercase tracking-wider h-10 px-6 shadow-sm"
                            >
                              Hapus
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
