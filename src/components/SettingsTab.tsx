/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, Database, AlertTriangle, RefreshCcw, ShieldCheck, Store, UserPlus, Users, Trash2, ShieldAlert } from 'lucide-react';
import { storage } from '@/src/lib/storage';
import { toast } from 'sonner';
import { User, UserRole } from '@/src/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// Cloud Sync Helpers
import { 
  saveStoreNameCloud, 
  saveUserToCloud, 
  deleteUserFromCloud, 
  syncAllBackupDataToCloud 
} from '@/src/lib/firestoreSync';

interface SettingsTabProps {
  onRefresh: () => void;
  currentUser: User;
}

export default function SettingsTab({ onRefresh, currentUser }: SettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storeName, setStoreName] = useState(storage.getStoreName());
  const [users, setUsers] = useState<User[]>([]);
  
  // User creation state
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'cashier' as UserRole
  });

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    setUsers(storage.getUsers());
  }, []);

  const handleSaveStoreName = async () => {
    storage.setStoreName(storeName);
    await saveStoreNameCloud(storeName);
    toast.success('Nama toko berhasil diperbarui di cloud.');
    onRefresh();
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast.error('Semua field harus diisi.');
      return;
    }

    const existingUser = users.find(u => u.username === newUser.username);
    if (existingUser) {
      toast.error('Username sudah digunakan.');
      return;
    }

    const userToAdd: User = {
      ...newUser,
      id: `user_${Date.now()}`,
      createdAt: Date.now()
    };

    const updatedUsers = [...users, userToAdd];
    setUsers(updatedUsers);
    storage.saveUsers(updatedUsers);
    
    // Cloud Sync
    await saveUserToCloud(userToAdd);
    
    setNewUser({ username: '', password: '', name: '', role: 'cashier' });
    toast.success(`User ${userToAdd.name} berhasil dibuat.`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      toast.error('Anda tidak bisa menghapus diri sendiri.');
      return;
    }

    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    storage.saveUsers(updatedUsers);
    
    // Cloud Sync
    await deleteUserFromCloud(userId);
    
    toast.info('User berhasil dihapus.');
  };

  const handleBackup = () => {
    const data = storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `warung_pintar_backup_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Backup data berhasil diunduh.');
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.products || !Array.isArray(data.products)) {
          throw new Error('Format file tidak valid.');
        }

        storage.importData(data);
        
        // Sync full restored contents to Cloud DB
        await syncAllBackupDataToCloud(data);
        
        onRefresh();
        toast.success('Restore data berhasil diselaraskan ke cloud.');
      } catch (err) {
        toast.error('Gagal restore data: ' + (err instanceof Error ? err.message : 'File tidak valid'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Account Info - Visible to Everyone */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="bg-indigo-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Profil Pengguna</CardTitle>
              <CardDescription className="text-indigo-100">
                Informasi akun yang sedang digunakan saat ini.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Lengkap</Label>
                <p className="text-lg font-bold text-slate-800">{currentUser.name}</p>
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username</Label>
                <p className="text-slate-600">@{currentUser.username}</p>
              </div>
            </div>
            <div className="space-y-4 text-right">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Role Akses</Label>
                <div className="flex justify-end mt-1">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border-2 ${
                    isAdmin ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {isAdmin ? 'PEMILIK / ADMIN' : 'Petugas Kasir'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Terdaftar sejak {new Date(currentUser.createdAt).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Only Sections */}
      {isAdmin && (
        <>
          {/* User Management Section */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">Manajemen Pengguna</CardTitle>
                    <CardDescription className="text-slate-500">Tambah atau hapus akses kasir.</CardDescription>
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger 
                    render={
                      <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-widest text-[10px]">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Tambah User
                      </Button>
                    }
                  />
                  <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-black tracking-tight">Buat Pengguna Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-name" className="text-xs font-bold uppercase tracking-widest text-slate-400">Nama Lengkap</Label>
                        <Input 
                          id="new-name" 
                          placeholder="Contoh: Budi Santoso" 
                          className="rounded-xl border-slate-200 h-11"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-username" className="text-xs font-bold uppercase tracking-widest text-slate-400">Username</Label>
                          <Input 
                            id="new-username" 
                            placeholder="budi_kasir" 
                            className="rounded-xl border-slate-200 h-11"
                            value={newUser.username}
                            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-password" className="text-xs font-bold uppercase tracking-widest text-slate-400">Password</Label>
                          <Input 
                            id="new-password" 
                            type="password" 
                            placeholder="Min 6 karakter" 
                            className="rounded-xl border-slate-200 h-11"
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Role / Peran</Label>
                        <div className="flex gap-2">
                          <Button 
                            type="button"
                            variant={newUser.role === 'cashier' ? 'default' : 'outline'}
                            onClick={() => setNewUser({...newUser, role: 'cashier'})}
                            className={`flex-1 rounded-xl h-11 font-bold ${newUser.role === 'cashier' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-200'}`}
                          >
                            KASIR
                          </Button>
                          <Button 
                            type="button"
                            variant={newUser.role === 'admin' ? 'default' : 'outline'}
                            onClick={() => setNewUser({...newUser, role: 'admin'})}
                            className={`flex-1 rounded-xl h-11 font-bold ${newUser.role === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-200'}`}
                          >
                            ADMIN
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateUser} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold uppercase tracking-widest text-xs">
                        Buat User Sekarang
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nama</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Username</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{user.name}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">@{user.username}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            user.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.id !== currentUser.id && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Store Settings Section */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg font-bold text-slate-800">Identitas Toko</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="storeName" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nama Toko
                  </Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="storeName"
                      placeholder="Masukkan nama toko..."
                      className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-600 font-bold"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveStoreName}
                  className="rounded-xl px-8 h-11 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs uppercase tracking-widest shadow-md"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Management Section */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Manajemen Database</CardTitle>
                  <CardDescription className="text-slate-500">Backup atau restore semua data aplikasi.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  onClick={handleBackup}
                  className="rounded-xl border-slate-200 hover:bg-slate-50 h-14 font-bold text-xs uppercase tracking-widest"
                >
                  <Download className="w-4 h-4 mr-2 text-indigo-600" />
                  Ekspor Database
                </Button>
                <div className="relative">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleRestore} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <Button 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-slate-200 hover:bg-slate-50 h-14 font-bold text-xs uppercase tracking-widest"
                  >
                    <Upload className="w-4 h-4 mr-2 text-amber-600" />
                    Impor Database
                  </Button>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-4">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-bold text-red-800 text-xs">Peringatan Penghapusan Data</h5>
                  <p className="text-[10px] text-red-700 leading-relaxed">
                    Restore data akan menghapus semua data saat ini. Pastikan file JSON yang Anda gunakan adalah file backup yang valid.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Utilities Section */}
      <div className="flex flex-col items-center justify-center pt-8 space-y-6">
        <Separator className="w-32 bg-slate-200" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRefresh}
          className="text-slate-400 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-widest gap-2"
        >
          <RefreshCcw className="w-3 h-3" />
          Mulai Ulang Sesi Aplikasi
        </Button>
        <p className="text-[10px] text-slate-300 font-medium">WarungPintar POS v2.0 &bull; Licensed for Commercial Use</p>
      </div>
    </div>
  );
}
