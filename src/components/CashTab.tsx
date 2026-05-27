/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/src/lib/format';
import { CashLog } from '@/src/types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  PlusCircle, 
  MinusCircle, 
  Trash2, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface CashTabProps {
  cashLogs: CashLog[];
  onAddMovement: (type: 'masuk' | 'keluar', source: 'modal' | 'penarikan', amount: number, description: string) => void;
  onDeleteLog?: (id: string) => void;
  isAdmin: boolean;
}

export default function CashTab({ cashLogs, onAddMovement, onDeleteLog, isAdmin }: CashTabProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'penjualan' | 'retur' | 'modal' | 'penarikan'>('all');
  
  // Dialog States
  const [showModalModal, setShowModalModal] = useState(false);
  const [showPenarikanModal, setShowPenarikanModal] = useState(false);
  
  // Input fields
  const [modalAmount, setModalAmount] = useState<number | ''>('');
  const [modalDesc, setModalDesc] = useState('');
  const [penarikanAmount, setPenarikanAmount] = useState<number | ''>('');
  const [penarikanDesc, setPenarikanDesc] = useState('');

  // Calculations
  const totalMasuk = useMemo(() => {
    return cashLogs
      .filter(log => log.type === 'masuk')
      .reduce((sum, log) => sum + log.amount, 0);
  }, [cashLogs]);

  const totalKeluar = useMemo(() => {
    return cashLogs
      .filter(log => log.type === 'keluar')
      .reduce((sum, log) => sum + log.amount, 0);
  }, [cashLogs]);

  const cashBalance = totalMasuk - totalKeluar;

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return cashLogs.filter(log => {
      const matchesSearch = log.description.toLowerCase().includes(search.toLowerCase()) || 
                            log.operatorName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || log.type === typeFilter;
      const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
      return matchesSearch && matchesType && matchesSource;
    });
  }, [cashLogs, search, typeFilter, sourceFilter]);

  const handleSaveModal = () => {
    if (!modalAmount || modalAmount <= 0) {
      toast.error('Jumlah modal harus lebih dari 0.');
      return;
    }
    onAddMovement('masuk', 'modal', Number(modalAmount), modalDesc);
    setModalAmount('');
    setModalDesc('');
    setShowModalModal(false);
  };

  const handleSavePenarikan = () => {
    if (!penarikanAmount || penarikanAmount <= 0) {
      toast.error('Jumlah penarikan harus lebih dari 0.');
      return;
    }
    if (penarikanAmount > cashBalance) {
      toast.error(`Penarikan melebihi saldo kas tunai saat ini (${formatCurrency(cashBalance)}).`);
      return;
    }
    onAddMovement('keluar', 'penarikan', Number(penarikanAmount), penarikanDesc);
    setPenarikanAmount('');
    setPenarikanDesc('');
    setShowPenarikanModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg border-none overflow-hidden relative">
          <div className="p-6 relative z-10">
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-2">Saldo Kas Tunai Fisik</p>
            <h2 className="text-3xl font-black font-mono tracking-tight">{formatCurrency(cashBalance)}</h2>
            <div className="flex gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest text-blue-200">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Real-time Sinkron
              </span>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-24 h-24 stroke-1" />
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Kas Masuk</p>
              <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{formatCurrency(totalMasuk)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-2 border-t border-slate-50">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Dari Penjualan :</span>
              <span className="font-bold font-mono">
                {formatCurrency(cashLogs.filter(l => l.source === 'penjualan').reduce((s, l) => s + l.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Tambahan Modal :</span>
              <span className="font-bold font-mono">
                {formatCurrency(cashLogs.filter(l => l.source === 'modal').reduce((s, l) => s + l.amount, 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Kas Keluar</p>
              <h3 className="text-2xl font-black text-rose-600 font-mono tracking-tight">{formatCurrency(totalKeluar)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-2 border-t border-slate-50">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Retur Penjualan :</span>
              <span className="font-bold font-mono">
                {formatCurrency(cashLogs.filter(l => l.source === 'retur').reduce((s, l) => s + l.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Penarikan Admin :</span>
              <span className="font-bold font-mono">
                {formatCurrency(cashLogs.filter(l => l.source === 'penarikan').reduce((s, l) => s + l.amount, 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {isAdmin ? (
          <>
            <Dialog open={showModalModal} onOpenChange={setShowModalModal}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-12 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold uppercase tracking-widest text-xs shadow-sm flex-1">
                  <PlusCircle className="w-4 h-4 mr-2 text-emerald-600" />
                  Tambah Modal Kas
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-emerald-600" />
                    Tambah Modal Kas Tunai
                  </DialogTitle>
                  <DialogDescription>
                    Mencatat tambahan modal kas operasional dari Administrator. Aliran ini akan menambah Saldo Kas Tunai.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="modalAmount">Jumlah Modal (Rp)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <Input 
                        id="modalAmount"
                        type="number" 
                        min="0"
                        className="pl-12 h-12 text-lg font-bold rounded-xl border-slate-200" 
                        placeholder="0"
                        value={modalAmount}
                        onChange={(e) => setModalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modalDesc">Keterangan / Deskripsi</Label>
                    <Input 
                      id="modalDesc"
                      placeholder="e.g., Modal Awal Pagi Kas Kasir"
                      className="rounded-xl h-11 border-slate-200 font-medium"
                      value={modalDesc}
                      onChange={(e) => setModalDesc(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowModalModal(false)} className="rounded-xl h-12 font-bold flex-1 border-slate-200">Batal</Button>
                  <Button onClick={handleSaveModal} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-100 h-12 font-bold flex-1">Simpan Modal</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showPenarikanModal} onOpenChange={setShowPenarikanModal}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-12 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold uppercase tracking-widest text-xs shadow-sm flex-1">
                  <MinusCircle className="w-4 h-4 mr-2 text-rose-600" />
                  Penarikan Kas Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <MinusCircle className="w-5 h-5 text-rose-600" />
                    Penarikan Kas Tunai Admin
                  </DialogTitle>
                  <DialogDescription>
                    Mencatat penarikan kas tunai dari kas warung (misal: setoran bank, keperluan pribadi owner). Aliran ini akan mengurangi Saldo Kas Tunai.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="penarikanAmount">Jumlah Penarikan (Rp)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <Input 
                        id="penarikanAmount"
                        type="number" 
                        min="0"
                        className="pl-12 h-12 text-lg font-bold rounded-xl border-slate-200" 
                        placeholder="0"
                        value={penarikanAmount}
                        onChange={(e) => setPenarikanAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="penarikanDesc">Keterangan / Deskripsi</Label>
                    <Input 
                      id="penarikanDesc"
                      placeholder="e.g., Setoran Pendapatan Mingguan atau Penggajian"
                      className="rounded-xl h-11 border-slate-200 font-medium"
                      value={penarikanDesc}
                      onChange={(e) => setPenarikanDesc(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowPenarikanModal(false)} className="rounded-xl h-12 font-bold flex-1 border-slate-200">Batal</Button>
                  <Button onClick={handleSavePenarikan} className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-lg shadow-rose-100 h-12 font-bold flex-1">Simpan Penarikan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-500 font-medium text-center w-full">
            Fitur Tambah Modal Tambahan dan Penarikan kas hanya dapat diakses oleh akun **Administrator / Pemilik**.
          </div>
        )}
      </div>

      {/* Logs Card */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="p-6 pb-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black text-slate-800">Riwayat Mutasi Kas</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Semua mutasi masuk dan keluar kas tunai fisik warung.</CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative w-full sm:w-56 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input 
                placeholder="Cari deskripsi / petugas..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200 focus-visible:ring-blue-600 font-medium text-xs bg-slate-50/50"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-xs bg-slate-50/50 outline-none text-slate-600 font-semibold focus-visible:ring-1 focus-visible:ring-blue-600 w-full sm:w-auto"
            >
              <option value="all">Semua Tipe</option>
              <option value="masuk">Kas Masuk (In)</option>
              <option value="keluar">Kas Keluar (Out)</option>
            </select>

            {/* Source filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-xs bg-slate-50/50 outline-none text-slate-600 font-semibold focus-visible:ring-1 focus-visible:ring-blue-600 w-full sm:w-auto"
            >
              <option value="all">Semua Sumber</option>
              <option value="penjualan">Penjualan</option>
              <option value="retur">Retur Penjualan</option>
              <option value="modal">Tambahan Modal</option>
              <option value="penarikan">Penarikan Admin</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Wallet className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-500">Tidak ada catatan kas</p>
              <p className="text-xs text-slate-400 max-w-[280px] mt-1">Belum ada pencatatan kas masuk / keluar dengan kriteria terpilih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest pl-6 h-11">Waktu</TableHead>
                    <TableHead className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest h-11">Petugas (Operator)</TableHead>
                    <TableHead className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest h-11">Tipe</TableHead>
                    <TableHead className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest h-11">Sumber</TableHead>
                    <TableHead className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest h-11">Jumlah</TableHead>
                    <TableHead className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest h-11">Keterangan</TableHead>
                    {isAdmin && <TableHead className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest text-right pr-6 h-11">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const formattedDate = new Date(log.timestamp).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });
                    const formattedTime = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <TableRow key={log.id} className="border-slate-100/80 hover:bg-slate-50/20">
                        <TableCell className="pl-6 py-4 font-mono text-xs text-slate-500">
                          <div>{formattedDate}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{formattedTime}</div>
                        </TableCell>
                        <TableCell className="font-bold text-xs text-slate-700">
                          {log.operatorName}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                            log.type === 'masuk' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {log.type === 'masuk' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3" />
                            )}
                            {log.type === 'masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-xs font-bold text-slate-600 uppercase tracking-tight">
                          {log.source === 'penjualan' && <span className="text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50">Penjualan</span>}
                          {log.source === 'retur' && <span className="text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded border border-amber-100/50">Retur Sls</span>}
                          {log.source === 'modal' && <span className="text-purple-600 bg-purple-50/50 px-2 py-0.5 rounded border border-purple-100/50">Modal</span>}
                          {log.source === 'penarikan' && <span className="text-rose-600 bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100/50">Withdraw</span>}
                        </TableCell>
                        <TableCell className={`font-black font-mono text-sm ${log.type === 'masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {log.type === 'masuk' ? '+' : '-'}{formatCurrency(log.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-medium max-w-[200px] truncate" title={log.description}>
                          {log.description}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="pr-6 text-right py-4">
                            {onDeleteLog && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDeleteLog(log.id)}
                                className="w-8 h-8 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Hapus catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
