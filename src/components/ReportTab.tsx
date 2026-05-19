/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Transaction } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { TrendingUp, Award, DollarSign, Calendar, Download } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, parseISO, format, isSameMonth } from 'date-fns';
import { utils, writeFile } from 'xlsx';

interface ReportTabProps {
  transactions: Transaction[];
}

type TimeFilter = 'today' | 'week' | 'month' | 'specific' | 'all';

interface ProductSales {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export default function ReportTab({ transactions }: ReportTabProps) {
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [specificMonth, setSpecificMonth] = useState(format(new Date(), 'yyyy-MM'));

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = typeof t.timestamp === 'string' ? parseISO(t.timestamp) : t.timestamp;
      if (filter === 'today') return isToday(date);
      if (filter === 'week') return isThisWeek(date);
      if (filter === 'month') return isThisMonth(date);
      if (filter === 'specific') {
        const [year, month] = specificMonth.split('-').map(Number);
        const targetDate = new Date(year, month - 1);
        return isSameMonth(date, targetDate);
      }
      return true;
    });
  }, [transactions, filter, specificMonth]);

  const productPerformance = useMemo(() => {
    const report: Record<string, ProductSales> = {};

    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        if (!report[item.id]) {
          report[item.id] = {
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        
        const soldQuantity = item.quantity - (item.returnedQuantity || 0);
        if (soldQuantity <= 0) return;

        const itemRevenue = item.price * soldQuantity;
        const itemCost = item.costPrice * soldQuantity;
        
        // Handle discount attribution proportionally
        // t.total and t.subtotal are already updated in PosApp for partial returns
        const ratio = t.subtotal > 0 ? t.total / t.subtotal : 1;
        const adjustedRevenue = itemRevenue * ratio;

        report[item.id].quantity += soldQuantity;
        report[item.id].revenue += adjustedRevenue;
        report[item.id].cost += itemCost;
        report[item.id].profit += (adjustedRevenue - itemCost);
      });
    });

    return Object.values(report).sort((a, b) => b.quantity - a.quantity);
  }, [filteredTransactions]);

  const bestSeller = productPerformance[0];
  const overallProfit = productPerformance.reduce((sum, p) => sum + p.profit, 0);
  const overallRevenue = productPerformance.reduce((sum, p) => sum + p.revenue, 0);

  const handleExport = () => {
    const data = productPerformance.map(p => ({
      'Nama Produk': p.name,
      'Kategori': p.category,
      'Terjual': p.quantity,
      'Omzet (Bruto)': p.revenue,
      'Total Pembelian': p.cost,
      'Estimasi Laba': p.profit,
      'Margin (%)': ((p.profit / p.revenue) * 100).toFixed(2) + '%'
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Laporan Performa');
    
    const fileName = `Laporan_Performa_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white rounded-2xl shadow-sm border-slate-200 border p-6 flex flex-col justify-center transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <DollarSign className="w-4 h-4" />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Omzet</p>
            </div>
            <h2 className="text-2xl font-black text-slate-800 font-mono tracking-tight">{formatCurrency(overallRevenue)}</h2>
        </Card>
        
        <Card className="bg-white rounded-2xl shadow-sm border-slate-200 border p-6 flex flex-col justify-center transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Estimasi Laba Bersih</p>
            </div>
            <h2 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{formatCurrency(overallProfit)}</h2>
        </Card>

        {bestSeller && (
            <Card className="bg-white rounded-2xl shadow-sm border-slate-200 border p-6 flex flex-col justify-center transition-all hover:shadow-md col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <Award className="w-4 h-4" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Produk Terlaris</p>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">{bestSeller.name}</h2>
                        <p className="text-xs text-slate-500 font-medium">Terjual {bestSeller.quantity} unit</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Penjualan</p>
                        <p className="font-mono font-bold text-indigo-600">{formatCurrency(bestSeller.revenue)}</p>
                    </div>
                </div>
            </Card>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="border-b bg-slate-50/50 py-6 px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <CardTitle className="text-xl font-bold text-slate-800">Laporan Performa Produk</CardTitle>
                <p className="text-slate-500 text-sm mt-1">Detail statistik penjualan setiap item</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex flex-wrap bg-white border border-slate-200 rounded-xl p-1 gap-1">
                    {[
                        { id: 'today', label: 'Hari Ini' },
                        { id: 'week', label: 'Minggu Ini' },
                        { id: 'month', label: 'Bulan Ini' },
                        { id: 'specific', label: 'Pilih Bulan' },
                        { id: 'all', label: 'Semua' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setFilter(item.id as TimeFilter)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                filter === item.id 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {filter === 'specific' && (
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1 animate-in slide-in-from-left-2 duration-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
                      <input 
                        type="month" 
                        value={specificMonth}
                        onChange={(e) => setSpecificMonth(e.target.value)}
                        className="text-[10px] font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer uppercase py-1"
                      />
                    </div>
                )}

                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    disabled={productPerformance.length === 0}
                >
                    <Download className="w-3 h-3" />
                    Ekspor ke XLS
                </button>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-200">
                <TableHead className="pl-8 font-bold text-xs uppercase text-slate-500">Nama Produk</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-500 text-center">Terjual</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Omzet (Bruto)</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Estimasi Laba</TableHead>
                <TableHead className="text-right pr-8 font-bold text-xs uppercase text-slate-500">Profit Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productPerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center text-slate-400 italic">
                    Belum ada data untuk ditampilkan
                  </TableCell>
                </TableRow>
              ) : (
                productPerformance.map((p) => {
                  const marginPercentage = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-100/50 transition-colors border-slate-100">
                      <TableCell className="pl-8">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                            {p.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-600">{formatCurrency(p.revenue)}</TableCell>
                      <TableCell className="text-right font-mono font-black text-emerald-600">{formatCurrency(p.profit)}</TableCell>
                      <TableCell className="text-right pr-8">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                            marginPercentage > 30 ? 'bg-emerald-100 text-emerald-700' : 
                            marginPercentage > 15 ? 'bg-blue-100 text-blue-700' : 
                            'bg-amber-100 text-amber-700'
                        }`}>
                            {marginPercentage.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
