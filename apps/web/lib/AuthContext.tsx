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
  signInWithRedirect,
  getRedirectResult,
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
    // Handle OAuth redirect result if redirect sign-in was triggered
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        console.log('[Firebase Auth] Google redirect login successful for UID:', result.user.uid);
        try {
          const userRef = doc(db, 'users', result.user.uid);
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              name: result.user.displayName || result.user.email?.split('@')[0],
              email: result.user.email,
              role: 'student',
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
          }
        } catch (firestoreErr) {
          console.warn("[Firebase Firestore] Redirect user doc write note:", firestoreErr);
        }
      }
    }).catch((err) => {
      console.warn('[Firebase Auth] Redirect result notice:', err.message);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        console.log('[Firebase Auth] Auth state changed:', firebaseUser ? `User ${firebaseUser.email} (${firebaseUser.uid})` : 'Unauthenticated');
        const mappedUser = await mapUser(firebaseUser);
        setUser(mappedUser);
      } catch (err) {
        console.error("[Firebase Auth] Auth mapping error:", err);
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
      console.log('[Firebase Auth] Initiating email/password login for:', normalizedEmail);
      const res = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      console.log('[Firebase Auth] Login successful for UID:', res.user.uid);
      try {
        await api.login({ email: normalizedEmail, password });
      } catch (backendErr) {
        console.warn("[Firebase Auth] Backend login sync note:", backendErr);
      }
    } catch (err: any) {
      console.error('[Firebase Auth] Login error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      console.log('[Firebase Auth] Initiating Google OAuth sign-in...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const result = await signInWithPopup(auth, provider);
        console.log('[Firebase Auth] Google popup login successful for UID:', result.user.uid);

        // Ensure user document exists in Firestore
        try {
          const userRef = doc(db, 'users', result.user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            console.log('[Firebase Firestore] Creating new user profile document for Google user:', result.user.uid);
            await setDoc(userRef, {
              name: result.user.displayName || result.user.email?.split('@')[0],
              email: result.user.email,
              role: 'student',
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
          }
        } catch (firestoreErr) {
          console.warn("[Firebase Firestore] User doc write note:", firestoreErr);
        }
      } catch (popupErr: any) {
        console.warn('[Firebase Auth] Popup OAuth attempt note:', popupErr.code, popupErr.message);
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.code === 'auth/operation-not-supported-in-this-environment' ||
          popupErr.code === 'auth/disallowed_useragent'
        ) {
          console.log('[Firebase Auth] Popup blocked or unsupported. Falling back to OAuth redirect mode...');
          await signInWithRedirect(auth, provider);
        } else if (popupErr.code === 'auth/popup-closed-by-user') {
          throw new Error('Google Sign-In popup was closed before completing. Please try again.');
        } else if (popupErr.code === 'auth/unauthorized-domain') {
          throw new Error('This domain/IP is not listed in Firebase Console Authorized Domains. Please add it in Firebase Console.');
        } else {
          throw popupErr;
        }
      }
    } catch (err: any) {
      console.error('[Firebase Auth] Google sign-in error:', err.message);
      const message = err.message || 'Google sign-in failed.';
      setError(message);
      throw new Error(message);
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
      console.log('[Firebase Auth] Creating user account:', normalizedEmail);

      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      console.log('[Firebase Auth] User created successfully. UID:', result.user.uid);

      // Update display name in Firebase Auth
      await firebaseUpdateProfile(result.user, { displayName: name });
      console.log('[Firebase Auth] Updated display name to:', name);

      // Create user document in Firestore (Menu Option integration)
      try {
        console.log('[Firebase Firestore] Creating user profile record for:', result.user.uid);
        await setDoc(doc(db, 'users', result.user.uid), {
          name,
          full_name: name,
          email: normalizedEmail,
          role,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
      } catch (firestoreErr) {
        console.warn("[Firebase Firestore] Profile creation note:", firestoreErr);
      }

      // Sync backend register to populate password_hash for Android login
      try {
        await api.signup({ email: normalizedEmail, password, name, confirmPassword, role });
      } catch (apiErr) {
        console.warn("[Firebase Auth] Backend signup sync note:", apiErr);
      }
    } catch (err: any) {
      console.error('[Firebase Auth] Signup error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('[Firebase Auth] Signing out user...');
      await signOut(auth);
      setUser(null);
      console.log('[Firebase Auth] User signed out successfully.');
    } catch (err: any) {
      console.error('[Firebase Auth] Logout error:', err.message);
      setError(err.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      console.log('[Firebase Auth] Sending password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('[Firebase Auth] Password reset email sent successfully.');
    } catch (err: any) {
      console.error('[Firebase Auth] Reset password error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const updateUserPassword = async (password: string) => {
    try {
      setError(null);
      if (!auth.currentUser) throw new Error("No authenticated user found.");
      console.log('[Firebase Auth/Security] Updating user password...');
      await firebaseUpdatePassword(auth.currentUser, password);
      console.log('[Firebase Auth/Security] Password updated successfully.');
    } catch (err: any) {
      console.error('[Firebase Auth/Security] Password update error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    try {
      setError(null);
      if (auth.currentUser) {
        if (updates.name || updates.avatar) {
          console.log('[Firebase Auth] Updating Auth profile fields:', updates);
          await firebaseUpdateProfile(auth.currentUser, {
            displayName: updates.name || auth.currentUser.displayName,
            photoURL: updates.avatar || auth.currentUser.photoURL,
          });
        }
      }
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (err: any) {
      console.error('[Firebase Auth] Update profile error:', err.message);
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

