/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storage } from '@/src/lib/storage';
import { User } from '@/src/types';
import { toast } from 'sonner';
import { LogIn, User as UserIcon, Lock, Store, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [storeId, setStoreId] = useState('');
  const [isNewStore, setIsNewStore] = useState(false);
  const [recentStores, setRecentStores] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stores = storage.getRecentStores();
    setRecentStores(stores);
    if (stores.length > 0) {
      setStoreId(stores[0]);
    } else {
      setIsNewStore(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate small delay for better UX
    setTimeout(() => {
      const formattedStoreId = storeId.trim().toLowerCase().replace(/\s+/g, '-');
      const user = storage.login(formattedStoreId, username, password);
      setIsLoading(false);

      if (user) {
        storage.addRecentStore(formattedStoreId);
        toast.success(`Selamat datang, ${user.name}!`);
        onLogin(user);
      } else {
        toast.error('Gagal login. Periksa Kode Toko, username, atau password.');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mb-4 shadow-xl shadow-black/10 border border-white/30">
            <Store className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">WARUNG PINTAR</h1>
          <p className="text-white/80 font-medium mt-1 drop-shadow-sm">Sistem Point of Sale Modern</p>
        </div>

        <Card className="border border-white/20 shadow-2xl rounded-[2rem] overflow-hidden bg-white/30 backdrop-blur-xl">
          <div className="flex items-center px-4 py-3 bg-white/10 border-b border-white/10">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm border border-red-500/20" />
              <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm border border-amber-500/20" />
              <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm border border-green-500/20" />
            </div>
            <div className="flex-1 text-center text-xs font-medium text-white/70 mr-12">Login - Point of Sale</div>
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storeId" className="text-xs font-bold uppercase tracking-wider text-white/80 ml-1">
                  Kode Cabang / Toko
                </Label>
                {(!isNewStore && recentStores.length > 0) ? (
                  <Select value={storeId} onValueChange={(val) => {
                    if (val === 'NEW_STORE') {
                      setIsNewStore(true);
                      setStoreId('');
                    } else {
                      setStoreId(val);
                    }
                  }}>
                    <SelectTrigger className="h-12 rounded-xl border-white/20 bg-white/20 text-white placeholder:text-white/50 focus:ring-white/50 focus:bg-white/30 transition-all font-mono shadow-inner backdrop-blur-md">
                      <div className="flex items-center">
                        <Store className="w-4 h-4 mr-2 text-white/70" />
                        <SelectValue placeholder="Pilih Cabang" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white/90 backdrop-blur-xl border-white/20 rounded-xl shadow-2xl">
                      {recentStores.map((store) => (
                        <SelectItem key={store} value={store} className="font-mono">{store}</SelectItem>
                      ))}
                      <SelectItem value="NEW_STORE" className="text-indigo-600 font-bold border-t mt-1">
                        + Tambah Cabang Baru
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                    <Input
                      id="storeId"
                      placeholder="Contoh: cabang-01"
                      className="pl-10 h-12 rounded-xl border-white/20 bg-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/50 focus-visible:bg-white/30 transition-all font-mono pr-12 shadow-inner backdrop-blur-md"
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                      required
                    />
                    {recentStores.length > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-10"
                        onClick={() => {
                          setIsNewStore(false);
                          setStoreId(recentStores[0]);
                        }}
                      >
                        Batal
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-white/80 ml-1">
                  Username
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                  <Input
                    id="username"
                    placeholder="Masukkan username"
                    className="pl-10 h-12 rounded-xl border-white/20 bg-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/50 focus-visible:bg-white/30 transition-all shadow-inner backdrop-blur-md"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-white/80 ml-1">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    className="pl-10 h-12 rounded-xl border-white/20 bg-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/50 focus-visible:bg-white/30 transition-all shadow-inner backdrop-blur-md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg backdrop-blur-md transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Masuk ke Sistem
                  </>
                )}
              </Button>

              <div className="pt-2 text-center flex flex-col gap-1">
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest drop-shadow-sm">
                  Akses dilindungi
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center text-white/60 text-xs font-medium drop-shadow-sm">
          &copy; {new Date().getFullYear()} WarungPintar POS System v2.0
        </div>
      </motion.div>
    </div>
  );
}
