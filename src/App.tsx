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
    <div className="min-h-screen bg-gradient-to-tr from-emerald-50/20 via-blue-50/50 to-indigo-100/30 font-sans text-slate-900 relative overflow-hidden">
      {/* Soft elegant background blobs to create a beautiful, ambient Tahoe-style clean glass layout */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-purple-300/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-96 h-96 rounded-full bg-indigo-200/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {currentUser ? (
          <PosApp currentUser={currentUser} onLogout={handleLogout} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
