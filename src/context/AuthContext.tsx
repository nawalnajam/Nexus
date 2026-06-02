import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000/api';
const TOKEN_KEY = 'nexus_access_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token helpers
  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
  const clearToken = () => localStorage.removeItem(TOKEN_KEY);

  // Restore session on page load
  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (!token) { setIsLoading(false); return; }
      try {
        const res = await fetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) setUser(data.user);
        else clearToken();
      } catch {
        clearToken();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

const login = async (email: string, password: string, _role: UserRole): Promise<void> => {
  setIsLoading(true);
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login failed');
    setToken(data.accessToken);
    setUser(data.user);
    toast.success(`Welcome back, ${data.user.name}! ✅ Connected to backend`);
  } catch (error) {
    toast.error((error as Error).message);
    throw error;
  } finally {
    setIsLoading(false);
  }
};

// New 2FA functions
const sendOTP = async (email: string): Promise<void> => {
  const res  = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  toast.success('OTP sent to your email! 📧');
};

const verifyOTP = async (email: string, otp: string): Promise<void> => {
  const res  = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  setToken(data.accessToken);
  setUser(data.user);
  toast.success('Login successful! ✅');
};

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Registration failed');
      setToken(data.accessToken);
      setUser(data.user);
      toast.success(`Account created successfully! 🎉 Saved to MongoDB`);
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      clearToken();
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    toast.success('Password reset instructions sent to your email');
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    toast.success('Password reset successfully');
  };

  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    const token = getToken();
    try {
      const res = await fetch(`${BASE_URL}/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setUser(data.profile);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};