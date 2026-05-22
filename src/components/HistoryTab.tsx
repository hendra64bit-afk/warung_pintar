/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Transaction } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { Calendar, Clock, ReceiptText, History as HistoryIcon, Trash2, Printer, RotateCcw } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, parseISO, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReceiptView from './ReceiptView';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HistoryTabProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onReturnBatch: (transactionId: string, returns: { productId: string, quantity: number }[]) => void;
  isAdmin: boolean;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

export default function HistoryTab({ transactions, onDelete, onReturnBatch, isAdmin }: HistoryTabProps) {
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [transactionToPrint, setTransactionToPrint] = useState<Transaction | null>(null);

  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [stagedReturns, setStagedReturns] = useState<Record<string, number>>({});

  const selectedTransaction = useMemo(() => 
    transactions.find(t => t.id === selectedTransactionId), 
  [transactions, selectedTransactionId]);

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Resi #${transactionToPrint?.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
            body { 
              font-family: 'JetBrains Mono', monospace; 
              padding: 20px;
              color: #1e293b;
            }
            @media print {
              body { padding: 0; }
              @page { size: auto; margin: 0; }
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          \${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = typeof t.timestamp === 'string' ? parseISO(t.timestamp) : t.timestamp;
      if (filter === 'today') return isToday(date);
      if (filter === 'week') return isThisWeek(date);
      if (filter === 'month') return isThisMonth(date);
      if (filter === 'custom') {
        const selectedDate = parseISO(customDate);
        return isSameDay(date, selectedDate);
      }
      return true;
    });
  }, [transactions, filter, customDate]);

  const activeTransactions = useMemo(() => filteredTransactions.filter(t => t.status !== 'returned'), [filteredTransactions]);

  const totalRevenue = activeTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalCost = activeTransactions.reduce((sum, t) => {
    const transactionCost = t.items.reduce((itemSum, item) => {
      const soldQuantity = item.quantity - (item.returnedQuantity || 0);
      return itemSum + (item.costPrice * soldQuantity);
    }, 0);
    return sum + transactionCost;
  }, 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg border-none overflow-hidden relative">
           <div className="p-6 relative z-10">
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-2">Total Pendapatan</p>
              <h2 className="text-3xl font-black font-mono tracking-tight">{formatCurrency(totalRevenue)}</h2>
           </div>
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <ReceiptText className="w-24 h-24" />
           </div>
        </Card>
        {isAdmin && (
          <Card className="bg-emerald-600 text-white rounded-2xl shadow-lg border-none overflow-hidden relative">
             <div className="p-6 relative z-10">
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-2">Estimasi Laba</p>
                <h2 className="text-3xl font-black font-mono tracking-tight">{formatCurrency(totalProfit)}</h2>
             </div>
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <ReceiptText className="w-24 h-24" />
             </div>
          </Card>
        )}
        <Card className="bg-white rounded-2xl shadow-sm border-slate-200 p-6 flex flex-col justify-center border transition-all hover:shadow-md">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Transaksi</p>
            <h2 className="text-3xl font-black text-slate-800">{filteredTransactions.length}</h2>
        </Card>
        <Card className="bg-white rounded-2xl shadow-sm border-slate-200 p-6 flex flex-col justify-center border transition-all hover:shadow-md">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Rata-rata Transaksi</p>
            <h2 className="text-3xl font-black text-slate-800 font-mono tracking-tight text-sm">
              {filteredTransactions.length > 0 ? formatCurrency(totalRevenue / filteredTransactions.length) : 'Rp0'}
            </h2>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b bg-slate-50/50 py-6 px-8 gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Daftar Transaksi</CardTitle>
            <p className="text-slate-500 text-sm mt-1">Riwayat aktivitas penjualan di kasir</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'week', label: 'Minggu Ini' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'custom', label: 'Pilih Tanggal' },
                { id: 'all', label: 'Semua' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id as TimeFilter)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all \${
                    filter === item.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {filter === 'custom' && (
              <div className="relative">
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="rounded-xl border-slate-200 h-10 text-[10px] font-bold uppercase tracking-widest text-slate-600 w-[160px] focus-visible:ring-indigo-600"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
                <TableRow className="border-slate-200">
                  <TableHead className="pl-8 font-bold text-xs uppercase text-slate-500">ID Transaksi</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500">Waktu</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500">Item</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Total</TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase text-slate-500">Aksi</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-xs uppercase text-slate-500">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HistoryIcon className="w-12 h-12 opacity-10 mb-2" />
                      <p>Tidak ada riwayat transaksi untuk periode ini</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-100/50 transition-colors border-slate-100">
                    <TableCell className="pl-8 font-mono text-[10px] text-slate-400 font-bold uppercase">#{t.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                          {format(typeof t.timestamp === 'string' ? parseISO(t.timestamp) : t.timestamp, 'dd MMM yyyy', { locale: id })}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {format(typeof t.timestamp === 'string' ? parseISO(t.timestamp) : t.timestamp, 'HH:mm')} WIB
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-slate-800">{t.items.length} Item</span>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                        {t.items.map(i => i.name).join(', ')}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-indigo-600">
                      <div className="flex flex-col items-end">
                        <span className="font-black">{formatCurrency(t.total)}</span>
                        {t.discountValue && t.discountValue > 0 && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            Disc: {t.discountType === 'percentage' ? `\${t.discountValue}%` : formatCurrency(t.discountValue)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Dialog open={isPrintDialogOpen && transactionToPrint?.id === t.id} onOpenChange={(open) => {
                          setIsPrintDialogOpen(open);
                          if (!open) setTransactionToPrint(null);
                        }}>
                          <DialogTrigger 
                            render={
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors h-8 w-8"
                                onClick={() => setTransactionToPrint(t)}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none">
                            <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
                              <DialogTitle className="text-slate-800 font-bold">Pratinjau Resi</DialogTitle>
                              <Button 
                                size="sm" 
                                onClick={handlePrint}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex gap-2 h-9 px-4"
                              >
                                <Printer className="w-4 h-4" />
                                Cetak
                              </Button>
                            </div>
                            <ScrollArea className="max-h-[70vh]">
                              {transactionToPrint && <ReceiptView transaction={transactionToPrint} />}
                            </ScrollArea>
                            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
                              <Button 
                                variant="outline" 
                                onClick={() => setIsPrintDialogOpen(false)}
                                className="w-full rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-wider"
                              >
                                Tutup
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Return Dialog */}
                        {t.status !== 'returned' && (
                          <Dialog open={isReturnDialogOpen && selectedTransactionId === t.id} onOpenChange={(open) => {
                            setIsReturnDialogOpen(open);
                            if (!open) {
                              setSelectedTransactionId(null);
                              setStagedReturns({});
                              setCustomQuantities({});
                            }
                          }}>
                            <DialogTrigger 
                              render={
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors h-8 w-8"
                                  onClick={() => setSelectedTransactionId(t.id)}
                                  title="Retur Barang"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              }
                            />
                            <DialogContent className="rounded-3xl border-slate-200 sm:max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-slate-800 font-bold">Retur Produk</DialogTitle>
                                <DialogDescription className="text-slate-500 text-sm">
                                  Pilih item dan jumlah yang ingin dikembalikan ke stok. Perubahan baru akan disimpan setelah konfirmasi.
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="py-4 border-y border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Transaksi</span>
                                  <span className="text-xs font-mono font-bold text-slate-800">#{t.id}</span>
                                </div>
                                
                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin">
                                  {t.items.map((item) => {
                                    const alreadyReturned = item.returnedQuantity || 0;
                                    const availableTotal = item.quantity - alreadyReturned;
                                    const staged = stagedReturns[item.id] || 0;
                                    const availableToStage = availableTotal - staged;

                                    return (
                                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all \${staged > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                          <div className="flex gap-4 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Terjual: {item.quantity}</span>
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Sudah: {alreadyReturned}</span>
                                            {staged > 0 && <span className="text-[10px] font-bold text-amber-600 uppercase">Baru: +{staged}</span>}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {availableTotal > 0 ? (
                                            <div className="flex items-center gap-2">
                                              <Input
                                                type="number"
                                                min="1"
                                                max={availableTotal}
                                                value={customQuantities[item.id] || 1}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value) || 1;
                                                  setCustomQuantities(prev => ({ 
                                                    ...prev, 
                                                    [item.id]: Math.min(availableTotal, Math.max(1, val)) 
                                                  }));
                                                }}
                                                className="w-16 h-8 text-center text-xs font-bold rounded-lg border-slate-200"
                                              />
                                              <Button 
                                                disabled={availableToStage <= 0}
                                                size="sm"
                                                onClick={() => {
                                                  const qty = Math.min(availableToStage, customQuantities[item.id] || 1);
                                                  setStagedReturns(prev => ({
                                                    ...prev,
                                                    [item.id]: (prev[item.id] || 0) + qty
                                                  }));
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase rounded-lg h-8 px-3"
                                              >
                                                Pilih
                                              </Button>
                                              
                                              {staged > 0 && (
                                                <Button 
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    setStagedReturns(prev => {
                                                      const next = { ...prev };
                                                      delete next[item.id];
                                                      return next;
                                                    });
                                                  }}
                                                  className="text-red-500 hover:text-red-600 font-bold text-[10px] uppercase h-8 px-2"
                                                >
                                                  Reset
                                                </Button>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase italic">Tuntas</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              <DialogFooter className="flex-row gap-3">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setIsReturnDialogOpen(false)}
                                  className="flex-1 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-wider h-11"
                                >
                                  Batal
                                </Button>
                                <Button 
                                  disabled={Object.keys(stagedReturns).length === 0}
                                  onClick={() => {
                                    const returnList = Object.entries(stagedReturns).map(([productId, quantity]) => ({
                                      productId,
                                      quantity: quantity as number
                                    }));
                                    
                                    const summary = returnList.map(r => {
                                      const item = t.items.find(i => i.id === r.productId);
                                      return `\${r.quantity} unit \${item?.name}`;
                                    }).join(", ");

                                    toast.warning("Lanjutkan Retur?", {
                                      description: `Anda akan melakukan retur: \${summary}. Stok akan dikembalikan sekarang.`,
                                      action: {
                                        label: "Ya, Retur",
                                        onClick: () => {
                                          onReturnBatch(t.id, returnList);
                                          setIsReturnDialogOpen(false);
                                          setStagedReturns({});
                                        }
                                      }
                                    });
                                  }}
                                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider h-11 shadow-lg shadow-amber-100"
                                >
                                  Konfirmasi Retur ({Object.keys(stagedReturns).length} Item)
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {isAdmin && (
                          <Dialog open={isDeleteDialogOpen && selectedTransactionId === t.id} onOpenChange={(open) => {
                            setIsDeleteDialogOpen(open);
                            if (!open) setSelectedTransactionId(null);
                          }}>
                            <DialogTrigger 
                              render={
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors h-8 w-8"
                                  onClick={() => setSelectedTransactionId(t.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              }
                            />
                            <DialogContent className="rounded-2xl border-slate-200">
                            <DialogHeader>
                              <DialogTitle className="text-slate-800 font-bold">Hapus Transaksi?</DialogTitle>
                              <DialogDescription className="text-slate-500 text-sm">
                                Tindakan ini tidak dapat dibatalkan. Riwayat transaksi ini akan dihapus permanen dan stok akan dikembalikan secara otomatis.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 border-y border-slate-100 flex flex-col gap-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Transaksi</span>
                                <span className="text-xs font-mono font-bold text-slate-800">#{t.id}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bayar</span>
                                <span className="text-sm font-black text-indigo-600">{formatCurrency(t.total)}</span>
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
                                  onDelete(t.id);
                                  setIsDeleteDialogOpen(false);
                                }}
                                className="flex-1 sm:flex-none rounded-xl bg-red-600 hover:bg-red-700 font-bold text-[10px] uppercase tracking-wider h-10 px-6 shadow-sm"
                              >
                                Hapus
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        )}
                    </div>
                  </TableCell>
                    <TableCell className="text-right pr-8">
                      {t.status === 'returned' ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200">
                          RETUR
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
                          SUCCESS
                        </span>
                      )}
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
