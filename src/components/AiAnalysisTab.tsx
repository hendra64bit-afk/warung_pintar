/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product, Transaction } from '@/src/types';
import { formatCurrency } from '@/src/lib/format';
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, TrendingDown, RefreshCw, Layers, CheckCircle2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

interface AiAnalysisTabProps {
  products: Product[];
  transactions: Transaction[];
}

interface CriticalStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  recommendedRestock: number;
  reason: string;
}

interface ProfitAnalysis {
  insights: string[];
  recommendations: string[];
}

interface ProductPerformItem {
  productId: string;
  name: string;
  revenue: number;
  quantitySold: number;
  profit: number;
  status: string; // 'Terlaris' | 'Stabil' | 'Lambat Laku' | 'Tidak Terjual'
}

interface AnalysisResult {
  summary: string;
  criticalStockAlerts: CriticalStockAlert[];
  profitAnalysis: ProfitAnalysis;
  productPerformance: ProductPerformItem[];
  isFallback?: boolean;
}

export default function AiAnalysisTab({ products, transactions }: AiAnalysisTabProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load cached analysis on mount
  useEffect(() => {
    const cached = localStorage.getItem('warungpintar_ai_analysis');
    if (cached) {
      try {
        setAnalysis(JSON.parse(cached));
      } catch (e) {
        console.error('Error parsing cached AI analysis', e);
      }
    }
  }, []);

  // Set up staggered loading text for beautiful reassurance
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    "Memilah dan mengelompokkan sediaan produk terdaftar...",
    "Menjaring data seluruh riwayat nota penjualan...",
    "Mengompilasi rasio HPP toko murni & estimasi laba...",
    "Menyusun strategi dan proyeksi maksimalisasi laba bersama Gemini AI..."
  ];

  const runAnalysis = async () => {
    if (products.length === 0) {
      toast.error("Belum ada produk yang terdaftar untuk dianalisis.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products, transactions }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal melakukan komunikasi dengan server.");
      }

      const data = await response.json();
      setAnalysis(data);
      localStorage.setItem('warungpintar_ai_analysis', JSON.stringify(data));
      toast.success("Analisis AI Gemini berhasil diselesaikan!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Terjadi kesalahan koneksi server saat meminta analisis.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPerformance = analysis?.productPerformance.filter(p => {
    if (filterStatus === 'all') return true;
    return p.status.toLowerCase() === filterStatus.toLowerCase();
  }) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Header */}
      <Card className="border-none bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Sparkles className="w-56 h-56" />
        </div>
        <CardContent className="p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Kecerdasan Buatan Terintegrasi
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Konsultasi Bisnis & Analisa AI Gemini</h1>
            <p className="text-indigo-200/80 text-sm leading-relaxed">
              Dapatkan rekomendasi restok yang presisi, identifikasi sediaan kritis secara cerdas, 
              serta wawasan keuangan mendalam untuk melambungkan profitabilitas Warung Anda secara murni.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
            <Button
              onClick={runAnalysis}
              disabled={loading}
              className="w-full md:w-auto px-6 py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 border border-indigo-500/30 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Menganalisis..." : analysis ? "Perbarui Analisis" : "Mulai Analisis AI"}
            </Button>
            {analysis && (
              <span className="text-[10px] text-slate-400 font-medium">
                Data dianalisa berdasarkan {products.length} Produk & {transactions.length} Transaksi
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading Canvas */}
      {loading && (
        <Card className="border-slate-200/80 shadow-md rounded-2xl bg-white p-12 text-center flex flex-col items-center justify-center gap-6 min-h-[400px]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-slate-800 font-extrabold text-lg">Gemini AI Sedang Berpikir...</h3>
            <p className="text-slate-400 text-xs leading-relaxed min-h-[40px] font-medium transition-all duration-300">
              {loadingMessages[loadingStep]}
            </p>
          </div>
        </Card>
      )}

      {/* Main Analysis Display */}
      {!loading && analysis && (
        <div className="space-y-6">
          
          {analysis.isFallback && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-start gap-3 shadow-sm animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Layanan AI Gemini sedang Sibuk (Error 503)</p>
                <p className="text-amber-700 font-medium leading-relaxed">
                  Model utama kami saat ini sedang penuh muatan jaringan atau mengalami lonjakan traffic global. 
                  Sistem otomatis beralih menyajikan analisis sediaan kritis dan performa laba riil toko berdasarkan formula retail cerdas lokal kami agar Warung Anda tetap beroperasi penuh tanpa kendala.
                </p>
              </div>
            </div>
          )}
          
          {/* Executive Summary Row */}
          <Card className="border-indigo-100 shadow-sm rounded-2xl bg-indigo-50/40 overflow-hidden border">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start gap-4 md:gap-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100 shrink-0 mt-1">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-slate-800 font-black text-md uppercase tracking-wide">Ringkasan Eksekutif Warung</h3>
                <p className="text-slate-700 text-sm leading-relaxed font-medium">
                  {analysis.summary}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Grid for Alerts & Profit Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Stock Alerts Column */}
            <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white border overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 py-5 px-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-md font-bold text-slate-800">Alert Deteksi Stok Kritis</CardTitle>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">Produk Butuh Restok Segera</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {analysis.criticalStockAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic gap-2.5">
                    <PackageCheck className="w-12 h-12 text-emerald-500 opacity-20" />
                    <p className="text-sm font-semibold text-slate-500">Stok Sediaan Aman Terkendali</p>
                    <p className="text-[10px] text-slate-400 text-center font-medium">Seluruh produk saat ini memiliki kuantitas stok di atas batas minimum.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
                    {analysis.criticalStockAlerts.map((alert, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <p className="text-sm font-black text-slate-800">{alert.productName}</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">{alert.reason}</p>
                          <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider pt-0.5">
                            <span className="text-amber-700">Stok Sekarang: {alert.currentStock} unit</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 shrink-0">
                          <span className="text-[10px] font-extrabold uppercase">Tambah Beli</span>
                          <span className="text-sm font-black font-mono">+{alert.recommendedRestock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profit Analysis & Strategy Recommendations */}
            <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white border overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 py-5 px-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-md font-bold text-slate-800">Wawasan Finansial & Rekomendasi Laba</CardTitle>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">Strategi Pengukuran Profit</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Insights Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Wawasan Penjualan Saat Ini
                  </h4>
                  <div className="space-y-2">
                    {analysis.profitAnalysis.insights.map((insight, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-600 font-semibold leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Recommendations Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Rekomendasi Pemaksimal Laba
                  </h4>
                  <div className="space-y-2">
                    {analysis.profitAnalysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start p-2.5 rounded-xl bg-indigo-50/20 border border-indigo-50/50">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-700 font-semibold leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Product Performance Table Column */}
          <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white border overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b bg-slate-50/50 py-5 px-6 gap-4">
              <div>
                <CardTitle className="text-md font-bold text-slate-800">Analisa Performa Penjualan Produk</CardTitle>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">Laju Perputaran Item & Kontribusi Laba kotor</p>
              </div>
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shrink-0 self-start md:self-center">
                {[
                  { id: 'all', label: 'Semua Status' },
                  { id: 'terlaris', label: 'Terlaris' },
                  { id: 'stabil', label: 'Stabil' },
                  { id: 'lambat laku', label: 'Lambat Laku' },
                  { id: 'tidak terjual', label: 'Tidak Terjual' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setFilterStatus(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all ${
                      filterStatus === item.id 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200">
                    <TableHead className="pl-6 font-bold text-xs uppercase text-slate-500">Nama Produk</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase text-slate-500">Kuantitas Terjual</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Omzet Penjualan</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase text-slate-500">Kontribusi Keuntungan</TableHead>
                    <TableHead className="text-center pr-6 font-bold text-xs uppercase text-slate-500">Status Laju</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">
                        Tidak ada produk dalam kategori status performa ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPerformance.map((p, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                        <TableCell className="pl-6 font-bold text-sm text-slate-800">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-600">
                          {p.quantitySold} unit
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-700">
                          {formatCurrency(p.revenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(p.profit)}
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            p.status === 'Terlaris' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' :
                            p.status === 'Stabil' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            p.status === 'Lambat Laku' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {p.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && !analysis && (
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-16 text-center border">
          <div className="flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
              <Sparkles className="w-8 h-8 animate-pulse text-indigo-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-slate-800 font-extrabold text-lg">Mulai Analisis Cerdas Pertama Anda</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Tekan tombol analisis untuk memicu model Gemini menganalisis tingkat persediaan, margin laba kotor, 
                rekaman transaksi pembayaran, dan sediaan lambat laku dari sistem POS Anda.
              </p>
            </div>
            <Button
              onClick={runAnalysis}
              className="mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider h-11 px-6 shadow-md shadow-indigo-100"
            >
              Proses Analisa Sekarang
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
