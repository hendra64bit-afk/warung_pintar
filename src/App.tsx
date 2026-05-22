/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import PosApp from './components/PosApp';
import Login from './components/Login';
import { Toaster } from 'sonner';
import { User } from './types';
import { storage } from './lib/storage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (simulated with localStorage for persistence)
    const savedUser = localStorage.getItem('warung-pintar-session');
    const storeId = storage.getActiveStoreId();
    if (savedUser && storeId) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      localStorage.removeItem('warung-pintar-session');
    }
    setIsInitialized(true);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('warung-pintar-session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('warung-pintar-session');
  };

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed font-sans text-slate-900" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')" }}>
      {currentUser ? (
        <PosApp currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Toaster position="top-center" richColors />
    </div>
  );
}
