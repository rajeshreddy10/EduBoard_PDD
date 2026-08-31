'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/lib/types';
import { api } from '@/lib/api';
import { auth, db } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, name: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map Firebase User to App User
  const mapUser = async (firebaseUser: FirebaseUser | null): Promise<User | null> => {
    if (!firebaseUser) return null;

    let userData: any = null;
    try {
      // Attempt to get Firestore data, but don't crash if it fails (e.g. offline/not enabled)
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      userData = userDoc.exists() ? userDoc.data() : null;
    } catch (err) {
      console.warn("Firestore user fetch failed (likely service not enabled):", err);
    }

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || userData?.full_name || userData?.name || firebaseUser.email?.split('@')[0] || 'User',
      role: userData?.role || 'student',
      username: userData?.username || firebaseUser.email?.split('@')[0] || '',
      avatar: firebaseUser.photoURL || '',
      isVerified: firebaseUser.emailVerified,
      isBiometricEnabled: userData?.isBiometricEnabled || false,
      createdAt: userData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        const mappedUser = await mapUser(firebaseUser);
        setUser(mappedUser);
      } catch (err) {
        console.error("Auth mapping error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const normalizedEmail = email.toLowerCase().trim();
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      try {
        await api.login({ email: normalizedEmail, password });
      } catch (backendErr) {
        console.warn("Backend login sync note:", backendErr);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Ensure user document exists (tolerate Firestore being unavailable/locked down)
      try {
        const userRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            name: result.user.displayName,
            email: result.user.email,
            role: 'student',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
        }
      } catch (firestoreErr) {
        console.warn("Firestore user doc write failed (likely rules not configured):", firestoreErr);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    confirmPassword: string,
    role: UserRole = 'student'
  ) => {
    try {
      setError(null);
      if (password !== confirmPassword) throw new Error("Passwords do not match");
      const normalizedEmail = email.toLowerCase().trim();

      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      // Update display name
      await firebaseUpdateProfile(result.user, { displayName: name });

      // Create user document with cross-platform compatible schema
      try {
        await setDoc(doc(db, 'users', result.user.uid), {
          name,
          full_name: name,
          email: normalizedEmail,
          role,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
      } catch (firestoreErr) {
        console.warn("Firestore user doc write failed:", firestoreErr);
      }

      // Sync backend register to populate password_hash for Android login
      try {
        await api.signup({ email: normalizedEmail, password, name, confirmPassword, role });
      } catch (apiErr) {
        console.warn("Backend signup sync note:", apiErr);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateUserPassword = async (password: string) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error("No authenticated user found.");
      await firebaseUpdatePassword(auth.currentUser, password);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    try {
      setError(null);
      if (auth.currentUser) {
        if (updates.name || updates.avatar) {
          await firebaseUpdateProfile(auth.currentUser, {
            displayName: updates.name || auth.currentUser.displayName,
            photoURL: updates.avatar || auth.currentUser.photoURL,
          });
        }
      }
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        signup,
        logout,
        resetPassword,
        updateUserPassword,
        updateUserProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

