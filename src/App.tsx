/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import PosApp from './components/PosApp';
import Login from './components/Login';
import { Toaster } from 'sonner';
import { User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (simulated with localStorage for persistence)
    const savedUser = localStorage.getItem('warung-pintar-session');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {currentUser ? (
        <PosApp currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Toaster position="top-center" richColors />
    </div>
  );
}
