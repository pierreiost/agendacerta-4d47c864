import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface ModalState {
  isOpen: boolean;
  data?: unknown;
}

interface StoredModalState {
  modals: Record<string, ModalState>;
  timestamp: number;
}

const STORAGE_KEY = 'modal_states';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hook for persisting modal/dialog open states across page reloads
 * Use this in page components to track which modals were open
 */
export function useModalPersist(pageKey: string) {
  const storageKey = `${STORAGE_KEY}_${pageKey}`;
  const hasRestoredRef = useRef(false);
  const modalsRef = useRef<Record<string, ModalState>>({});
  const [isReady, setIsReady] = useState(false);

  // Restore modal states on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: StoredModalState = JSON.parse(stored);
        
        // Check if state is still valid
        if (Date.now() - parsed.timestamp < MAX_AGE_MS) {
          modalsRef.current = parsed.modals;
          
          // Check if any modal was open
          const hasOpenModal = Object.values(parsed.modals).some(m => m.isOpen);
          if (hasOpenModal) {
            toast.info('Continuando de onde você parou', {
              description: 'Seu trabalho foi recuperado automaticamente.',
              duration: 3000,
            });
          }
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to restore modal states:', error);
      localStorage.removeItem(storageKey);
    }

    setIsReady(true);
  }, [storageKey]);

  // Save modal states to storage
  const saveStates = useCallback(() => {
    try {
      const state: StoredModalState = {
        modals: modalsRef.current,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save modal states:', error);
    }
  }, [storageKey]);

  // Save on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveStates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveStates]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStates();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStates]);

  // Register a modal and get its initial state
  const registerModal = useCallback((modalId: string, defaultOpen = false): boolean => {
    if (!isReady) return defaultOpen;
    
    const savedState = modalsRef.current[modalId];
    return savedState?.isOpen ?? defaultOpen;
  }, [isReady]);

  // Update modal state
  const setModalState = useCallback((modalId: string, isOpen: boolean, data?: unknown) => {
    modalsRef.current = {
      ...modalsRef.current,
      [modalId]: { isOpen, data },
    };
    saveStates();
  }, [saveStates]);

  // Get modal data
  const getModalData = useCallback(<T = unknown>(modalId: string): T | undefined => {
    return modalsRef.current[modalId]?.data as T | undefined;
  }, []);

  // Clear all modal states for this page
  const clearAll = useCallback(() => {
    modalsRef.current = {};
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Clear specific modal state
  const clearModal = useCallback((modalId: string) => {
    delete modalsRef.current[modalId];
    saveStates();
  }, [saveStates]);

  return {
    isReady,
    registerModal,
    setModalState,
    getModalData,
    clearAll,
    clearModal,
  };
}
