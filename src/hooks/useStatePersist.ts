import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseStatePersistOptions<T> {
  key: string;
  state: T;
  setState: React.Dispatch<React.SetStateAction<T>>;
  debounceMs?: number;
  showRecoveryToast?: boolean;
  isReady?: boolean;
}

export function useStatePersist<T>({
  key,
  state,
  setState,
  debounceMs = 500,
  showRecoveryToast = true,
  isReady = true,
}: UseStatePersistOptions<T>) {
  const storageKey = `state_draft_${key}`;
  const hasRestoredRef = useRef(false);
  const isInitializedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Restore draft on mount (only once, after isReady becomes true)
  useEffect(() => {
    if (!isReady || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const data = parsed.data;
        const timestamp = parsed.timestamp;

        // Check if draft is less than 24 hours old
        const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;

        if (isRecent && data) {
          setState(data);
          isInitializedRef.current = true;

          if (showRecoveryToast) {
            toast.info('Continuando de onde você parou', {
              description: 'Seu rascunho foi recuperado automaticamente.',
              duration: 4000,
            });
          }
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to restore state draft:', error);
      localStorage.removeItem(storageKey);
    }

    // Mark as initialized after a short delay to allow for initial state to settle
    setTimeout(() => {
      isInitializedRef.current = true;
    }, 100);
  }, [isReady, storageKey, setState, showRecoveryToast]);

  // Save draft with debounce (only after initialized)
  useEffect(() => {
    if (!isReady || !isInitializedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            data: stateRef.current,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.warn('Failed to save state draft:', error);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, isReady, storageKey, debounceMs]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Prevent page unload with unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInitializedRef.current) {
        // Save current state before leaving
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              data: stateRef.current,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.warn('Failed to save state on unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [storageKey]);

  // Also save on visibility change (when switching tabs/apps)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isInitializedRef.current) {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              data: stateRef.current,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.warn('Failed to save state on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [storageKey]);

  return {
    clearDraft,
  };
}
