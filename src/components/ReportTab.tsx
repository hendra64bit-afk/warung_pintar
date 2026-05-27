/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Transaction, ExpenseRecord } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { 
  TrendingUp, 
  Award, 
  DollarSign, 
  Calendar, 
  Download, 
  Plus, 
  Trash, 
  Receipt, 
  TrendingDown, 
  ShieldAlert,
  BarChart3,
  Coins
} from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, parseISO, format, isSameMonth } from 'date-fns';
import { utils, writeFile } from 'xlsx';
import { toast } from 'sonner';

interface ReportTabProps {
  transactions: Transaction[];
  expenses: ExpenseRecord[];
  onAddExpense: (name: string, amount: number, date: string) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  isAdmin: boolean;
}

type TimeFilter = 'today' | 'week' | 'month' | 'specific' | 'all';
type SubMenu = 'performance' | 'revenue-loss';

interface ProductSales {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export default function ReportTab({ 
  transactions, 
  expenses = [], 
  onAddExpense, 
  onDeleteExpense, 
  isAdmin 
}: ReportTabProps) {
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [specificMonth, setSpecificMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState<SubMenu>('performance');

  // Form State for Expense input
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitLoading, setSubmitLoading] = useState(false);

  // Filtered Transactions
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

  // Filtered Expenses (Beban)
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.date) return false;
      const date = parseISO(e.date);
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
  }, [expenses, filter, specificMonth]);

  // Calculate Product Performance
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
        const itemCost = (item.costPrice || 0) * soldQuantity;
        
        // Handle discount attribution proportionally
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
  const overallRevenue = productPerformance.reduce((sum, p) => sum + p.revenue, 0);
  const overallCost = productPerformance.reduce((sum, p) => sum + p.cost, 0);
  const overallGrossProfit = overallRevenue - overallCost;

  // Operational Expenses Total Sum
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Net Profit (Laba Bersih Akhir)
  const netProfit = overallGrossProfit - totalExpenses;

  // Handle Adding Expense operational
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Hanya Admin yang dapat menambahkan kategori beban operasional.');
      return;
    }
    if (!expenseName.trim()) {
      toast.error('Nama beban tidak boleh kosong.');
      return;
    }
    const amountVal = parseFloat(expenseAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Jumlah nominal beban harus bernilai lebih dari 0.');
      return;
    }
    if (!expenseDate) {
      toast.error('Tanggal pengeluaran beban harus dipilih.');
      return;
    }

    try {
      setSubmitLoading(true);
      await onAddExpense(expenseName, amountVal, expenseDate);
      setExpenseName('');
      setExpenseAmount('');
      toast.success('Beban baru berhasil dicatat!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencatat beban.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Export Product Performance and stats
  const handleExportPerformance = () => {
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

  // Export financial statement (Laba Rugi)
  const handleExportFinancials = () => {
    const mainStatement = [
      { 'Jenis Laporan': 'Laporan Laba Rugi', 'Komponen Keuangan': 'PENDAPATAN', 'Uraian': 'Pendapatan Penjualan (Omzet)', 'Jumlah Nominal': overallRevenue },
      { 'Jenis Laporan': 'Laporan Laba Rugi', 'Komponen Keuangan': 'HARGA POKOK', 'Uraian': 'Harga Pokok Penjualan (HPP / Modal)', 'Jumlah Nominal': overallCost },
      { 'Jenis Laporan': 'Laporan Laba Rugi', 'Komponen Keuangan': 'LABA KOTOR', 'Uraian': 'Laba Kotor Penjualan', 'Jumlah Nominal': overallGrossProfit },
      { 'Jenis Laporan': 'Laporan Laba Rugi', 'Komponen Keuangan': 'BEBAN OPERASIONAL', 'Uraian': 'Total Beban Operasional', 'Jumlah Nominal': totalExpenses },
      { 'Jenis Laporan': 'Laporan Laba Rugi', 'Komponen Keuangan': 'LABA BERSIH', 'Uraian': 'Laba Bersih Setelah Beban', 'Jumlah Nominal': netProfit }
    ];

    // Detil beban list
    const detailBeban = filteredExpenses.map(e => ({
      'Jenis Laporan': 'Detil Beban',
      'Komponen Keuangan': 'BEBAN OPERASIONAL',
      'Uraian': `${e.name} (${e.date})`,
      'Jumlah Nominal': e.amount
    }));

    const worksheetData = [...mainStatement, { 'Jenis Laporan': '', 'Komponen Keuangan': '', 'Uraian': '--- Rincian Beban Terdaftar ---', 'Jumlah Nominal': null }, ...detailBeban];

    const ws = utils.json_to_sheet(worksheetData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Laporan Laba Rugi');
    
    const fileName = `Laporan_Laba_Rugi_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION WITH TIME FILTER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600" />
            Laporan Keuangan
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">Analisis rinci kinerja bisnis, performa penjualan produk, dan laporan laba rugi.</p>
        </div>

        {/* Global Time Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
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
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filter === 'specific' && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 animate-in slide-in-from-left-2 duration-300 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input 
                type="month" 
                value={specificMonth}
                onChange={(e) => setSpecificMonth(e.target.value)}
                className="text-[10px] font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer uppercase p-0 h-4"
              />
            </div>
          )}
        </div>
      </div>

      {/* DUAL TAP BAR FOR SUB MENUS */}
      <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-full md:w-fit gap-1">
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex-1 md:flex-none transition-all ${
            activeTab === 'performance'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Performa Produk
        </button>
        <button
          onClick={() => setActiveTab('revenue-loss')}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex-1 md:flex-none transition-all ${
            activeTab === 'revenue-loss'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <Coins className="w-4 h-4" />
          Laporan Laba Rugi
        </button>
      </div>

      {/* PERFORMANCE SUB MENU TAB */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* TOP THREE METRIC CARDS */}
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
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Estimasi Laba Kotor</p>
                </div>
                <h2 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{formatCurrency(overallGrossProfit)}</h2>
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
                            <p className="text-xs text-slate-500 font-medium mt-1">Terjual {bestSeller.quantity} unit</p>
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
                <div>
                    <button 
                        onClick={handleExportPerformance}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        disabled={productPerformance.length === 0}
                    >
                        <Download className="w-3.5 h-3.5" />
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
      )}

      {/* SUB MENU LABA RUGI STATEMENT */}
      {activeTab === 'revenue-loss' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: MAIN STRUCTURED PROFIT & LOSS STATEMENT (8 columns) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden p-6 md:p-8">
              <div className="border-b pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800">Laporan Laba Rugi</h2>
                  <p className="text-slate-500 text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1 mt-0.5">
                    Periode: {filter === 'all' ? 'Semua Waktu' : filter === 'today' ? 'Hari Ini' : filter === 'week' ? 'Minggu Ini' : filter === 'month' ? 'Bulan Ini' : `Bulan ${specificMonth}`}
                  </p>
                </div>
                <button 
                  onClick={handleExportFinancials}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Laba Rugi
                </button>
              </div>

              {/* PROFIT & LOSS BREAKDOWN TABLE */}
              <div className="space-y-4 text-sm">
                
                {/* 1. REVENUE (PENDAPATAN) */}
                <div className="space-y-2">
                  <div className="flex font-bold text-slate-700 justify-between items-center text-xs uppercase tracking-wider">
                    <span>1. Pendapatan</span>
                    <span>Jumlah</span>
                  </div>
                  <div className="flex justify-between items-center pl-4 py-1 text-slate-600 font-medium">
                    <span>Pendapatan Penjualan Bersih (Omzet)</span>
                    <span className="font-mono">{formatCurrency(overallRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center pl-4 border-b pb-2 font-bold text-slate-700">
                    <span>Subtotal Pendapatan</span>
                    <span className="font-mono text-indigo-700">{formatCurrency(overallRevenue)}</span>
                  </div>
                </div>

                {/* 2. COST OF GOODS SOLD (HPP / BEBAN POKOK) */}
                <div className="space-y-2 pt-2">
                  <div className="flex font-bold text-slate-700 justify-between items-center text-xs uppercase tracking-wider">
                    <span>2. Harga Pokok Penjualan (HPP)</span>
                    <span>Total HPP</span>
                  </div>
                  <div className="flex justify-between items-center pl-4 py-1 text-slate-600 font-medium">
                    <span>Total Harga Modal Produk Terjual</span>
                    <span className="font-mono text-red-500">(-){formatCurrency(overallCost)}</span>
                  </div>
                  <div className="flex justify-between items-center pl-4 border-b pb-2 font-bold text-slate-700">
                    <span>Total Harga Pokok (HPP)</span>
                    <span className="font-mono text-red-600">({formatCurrency(overallCost)})</span>
                  </div>
                </div>

                {/* 3. GROSS PROFIT (LABA KOTOR) */}
                <div className="bg-slate-50/80 border border-slate-200/50 rounded-xl p-4 flex justify-between items-center my-4">
                  <span className="font-extrabold text-slate-800 uppercase tracking-tight text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Laba Kotor Penjualan
                  </span>
                  <span className="font-mono font-black text-slate-800 text-base">{formatCurrency(overallGrossProfit)}</span>
                </div>

                {/* 4. EXPENSES (BEBAN OPERASIONAL) */}
                <div className="space-y-2 pt-2">
                  <div className="flex font-bold text-slate-700 justify-between items-center text-xs uppercase tracking-wider">
                    <span>3. Beban Operasional</span>
                    <span>Nominal</span>
                  </div>
                  
                  {filteredExpenses.length === 0 ? (
                    <div className="text-slate-400 italic text-xs pl-4 py-3">
                      Tidak ada catatan beban operasional pada periode ini
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto pr-1">
                      {filteredExpenses.map((exp) => (
                        <div key={exp.id} className="flex justify-between items-center pl-4 py-2 hover:bg-slate-50 transition-all rounded-md group text-xs text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{exp.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{exp.date} &bull; Oleh: {exp.operatorName}</span>
                          </div>
                          <span className="font-mono text-amber-600 font-medium">({formatCurrency(exp.amount)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pl-4 border-b border-t pt-2 pb-2 font-bold text-slate-700">
                    <span>Total Beban Operasional</span>
                    <span className="font-mono text-amber-700">({formatCurrency(totalExpenses)})</span>
                  </div>
                </div>

                {/* 5. NET PROFIT (LABA BERSIH AKHIR) */}
                <div className={`rounded-xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 ${
                  netProfit >= 0 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl flex items-center justify-center ${
                      netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {netProfit >= 0 ? (
                        <TrendingUp className="w-5 h-5 animate-pulse" />
                      ) : (
                        <TrendingDown className="w-5 h-5 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wider">Laba Bersih Akhir</h3>
                      <p className={`text-[10px] font-semibold mt-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {netProfit >= 0 ? 'Menguntungkan (Laba)' : 'Kerugian Operasional (Rugi)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-3xl font-black font-mono tracking-tight">
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>

              </div>
            </Card>
          </div>

          {/* RIGHT PANEL: ADD EXPENSE FORM & DETAILED ACTIONS (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* INPUT EXPENSE FORM */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden p-6">
              <CardHeader className="p-0 pb-4 mb-4 border-b">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  Catat Beban Operasional
                </CardTitle>
                <CardDescription className="text-xs">
                  Masukkan biaya operasional warung (listrik, wifi, gaji karyawan, sosis, dll).
                </CardDescription>
              </CardHeader>
              
              {isAdmin ? (
                <form onSubmit={handleSubmitExpense} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Deskripsi Beban / Biaya
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pembayaran Listrik Mei, Gaji Karyawan"
                      value={expenseName}
                      onChange={(e) => setExpenseName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-600 bg-slate-50 focus:bg-white transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Nominal Pengeluaran (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Contoh: 150000"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-600 bg-slate-50 focus:bg-white transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Tanggal Biaya
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-600 bg-slate-50 focus:bg-white transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {submitLoading ? 'Menyimpan...' : 'Catat Pengeluaran Beban'}
                  </button>
                </form>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-xs">Akses Terbatas</h5>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                      Hanya user dengan peran **Administrator** yang diizinkan untuk menginput beban baru atau menghapus beban terdaftar.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* DETAILED EXPENSES MANAGE TABLE */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden p-6">
              <CardHeader className="p-0 pb-3 mb-3 border-b">
                <CardTitle className="text-sm font-bold text-slate-800">
                  Daftar Pengeluaran Terdaftar
                </CardTitle>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  Menampilkan {filteredExpenses.length} catatan beban periodik
                </p>
              </CardHeader>
              
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  Tidak ada pengeluaran beban terdaftar
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {filteredExpenses.map((exp) => (
                    <div 
                      key={exp.id} 
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-xs"
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-800">{exp.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 text-[9px] text-slate-400 font-bold uppercase">
                          <span>{exp.date}</span>
                          <span>&bull;</span>
                          <span>Oleh: {exp.operatorName}</span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-600 font-bold mt-1">
                          {formatCurrency(exp.amount)}
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Konfirmasi hapus pengeluaran ${exp.name}?`)) {
                              await onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all rounded-lg"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>

        </div>
      )}

    </div>
  );
}
