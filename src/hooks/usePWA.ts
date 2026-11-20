/**
 * Hook usePWA - Gerencia registro do Service Worker e instalação PWA.
 * Detecta suporte, registra SW, gerencia updates e prompt de instalação.
 */

import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    updateAvailable: false,
    installPrompt: null,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Detectar se está rodando como PWA instalado
  const checkInstalled = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = ('standalone' in window.navigator) && (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isStandalone || isIOSStandalone;
  }, []);

  // Registrar Service Worker
  const registerSW = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker não suportado');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setRegistration(reg);

      // Verificar updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setState((prev) => ({ ...prev, updateAvailable: true }));
          }
        });
      });

      // Controller change = novo SW ativo
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      console.log('[PWA] Service Worker registrado:', reg.scope);
    } catch (error) {
      console.error('[PWA] Erro ao registrar SW:', error);
    }
  }, []);

  // Listener para beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setState((prev) => ({
        ...prev,
        isInstallable: true,
        installPrompt: promptEvent,
      }));
    };

    const handleAppInstalled = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar se já está instalado
    setState((prev) => ({ ...prev, isInstalled: checkInstalled() }));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInstalled]);

  // Registrar SW no mount
  useEffect(() => {
    registerSW();
  }, [registerSW]);

  // Prompt de instalação
  const promptInstall = useCallback(async () => {
    if (!state.installPrompt) return false;

    try {
      await state.installPrompt.prompt();
      const choice = await state.installPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        setState((prev) => ({
          ...prev,
          isInstalled: true,
          isInstallable: false,
          installPrompt: null,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [state.installPrompt]);

  // Aplicar update do SW
  const applyUpdate = useCallback(async () => {
    if (!registration?.waiting) return;

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setState((prev) => ({ ...prev, updateAvailable: false }));
  }, [registration]);

  // Verificar update manualmente
  const checkForUpdate = useCallback(async () => {
    if (registration) {
      await registration.update();
    }
  }, [registration]);

  return {
    ...state,
    registration,
    promptInstall,
    applyUpdate,
    checkForUpdate,
    isSupported: 'serviceWorker' in navigator,
  };
};

export type { PWAState };