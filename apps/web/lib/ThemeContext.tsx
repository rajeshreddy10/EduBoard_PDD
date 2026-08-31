'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredTheme, getStoredAccent, applyTheme, applyAccent, type ThemeId } from './theme';
import { useAuth } from './AuthContext';
import { userProfileService } from './services/firebaseData';

interface ThemeContextType {
  theme: ThemeId;
  accentColor: string;
  isDark: boolean;
  setTheme: (theme: ThemeId) => void;
  setAccentColor: (color: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  accentColor: '#3b82f6',
  isDark: false,
  setTheme: () => {},
  setAccentColor: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>('light');
  const [accentColor, setAccentColorState] = useState<string>('#3b82f6');

  useEffect(() => {
    const storedTheme = getStoredTheme();
    const storedAccent = getStoredAccent();
    setThemeState(storedTheme);
    setAccentColorState(storedAccent);
    applyTheme(storedTheme);
    applyAccent(storedAccent);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    async function syncThemeFromFirestore() {
      try {
        const profile = await userProfileService.getProfile(user!.id);
        if (profile) {
          if ((profile as any).theme) {
            setThemeState((profile as any).theme);
            applyTheme((profile as any).theme);
          }
          if ((profile as any).accentColor) {
            setAccentColorState((profile as any).accentColor);
            applyAccent((profile as any).accentColor);
          }
        }
      } catch (err) {
        console.warn('Failed to load user theme from Firestore:', err);
      }
    }
    syncThemeFromFirestore();
  }, [user?.id]);

  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = getStoredTheme();
      const currentAccent = getStoredAccent();
      setThemeState(currentTheme);
      setAccentColorState(currentAccent);
    };

    window.addEventListener('theme-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const handleSetTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    if (user?.id) {
      userProfileService.updateProfile(user.id, { theme: newTheme } as any).catch(console.error);
    }
  };

  const handleSetAccent = (color: string) => {
    setAccentColorState(color);
    applyAccent(color);
    if (user?.id) {
      userProfileService.updateProfile(user.id, { accentColor: color } as any).catch(console.error);
    }
  };

  const toggleTheme = () => {
    const nextTheme: ThemeId = theme === 'dark' ? 'light' : 'dark';
    handleSetTheme(nextTheme);
  };

  const isDark = theme !== 'light';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accentColor,
        isDark,
        setTheme: handleSetTheme,
        setAccentColor: handleSetAccent,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
