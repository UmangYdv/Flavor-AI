import React, { createContext, useContext, useEffect, useState } from 'react';
import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const NATIVE_AUTH_REDIRECT_URL = 'flavorai://auth';

function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

function getAuthCallbackParam(url: string, key: string) {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  return parsedUrl.searchParams.get(key) ?? hashParams.get(key);
}

async function completeNativeAuthSession(url: string) {
  const errorCode = getAuthCallbackParam(url, 'error_code');
  const errorDescription = getAuthCallbackParam(url, 'error_description');

  if (errorCode) {
    throw new Error(errorDescription ?? errorCode);
  }

  const authCode = getAuthCallbackParam(url, 'code');
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) throw error;
    return;
  }

  const accessToken = getAuthCallbackParam(url, 'access_token');
  const refreshToken = getAuthCallbackParam(url, 'refresh_token');

  if (!accessToken || !refreshToken) {
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) throw error;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let appUrlListener: PluginListenerHandle | undefined;

    const handleNativeAuthCallback = async ({ url }: Pick<URLOpenListenerEvent, 'url'>) => {
      if (!url?.startsWith(NATIVE_AUTH_REDIRECT_URL)) return;

      try {
        await completeNativeAuthSession(url);
        await Browser.close();
      } catch (error) {
        console.error('Failed to complete native auth callback', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    (async () => {
      if (isNativePlatform()) {
        appUrlListener = await CapacitorApp.addListener('appUrlOpen', handleNativeAuthCallback);

        const launchUrl = await CapacitorApp.getLaunchUrl();
        if (launchUrl?.url) {
          await handleNativeAuthCallback(launchUrl);
        }
      }

      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) {
        console.error(error);
      }
      setUser(data.user ?? null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
      void appUrlListener?.remove();
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    const native = isNativePlatform();
    const redirectTo = native ? NATIVE_AUTH_REDIRECT_URL : window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        ...(native ? { skipBrowserRedirect: true } : {}),
      },
    });
    if (error) throw error;

    if (native) {
      if (!data?.url) {
        throw new Error('Supabase did not return an OAuth URL for native sign-in.');
      }

      await Browser.open({ url: data.url });
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
