import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Merchant } from '../types';
import { getMeApi, loginApi, signupApi, logoutApi, LoginInput, SignupInput } from '../api/auth.api';

interface AuthContextType {
  user: User | null;
  merchant: Merchant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  signup: (data: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  updateMerchant: (merchant: Merchant) => void;
  updateUserProfile: (user: User, merchant: Merchant) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const data = await getMeApi();
      if (data && data.user && data.merchant) {
        setUser(data.user);
        setMerchant(data.merchant);
      } else {
        setUser(null);
        setMerchant(null);
      }
    } catch {
      setUser(null);
      setMerchant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (data: LoginInput) => {
    const res = await loginApi(data);
    setUser(res.user);
    setMerchant(res.merchant);
  };

  const signup = async (data: SignupInput) => {
    const res = await signupApi(data);
    setUser(res.user);
    setMerchant(res.merchant);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setMerchant(null);
    }
  };

  const updateMerchant = (updatedMerchant: Merchant) => {
    setMerchant(updatedMerchant);
  };

  const updateUserProfile = (updatedUser: User, updatedMerchant: Merchant) => {
    setUser(updatedUser);
    setMerchant(updatedMerchant);
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const value: AuthContextType = {
    user,
    merchant,
    isAuthenticated: Boolean(user && merchant),
    isLoading,
    login,
    signup,
    logout,
    updateMerchant,
    updateUserProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
