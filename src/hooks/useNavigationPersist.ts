import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface NavigationState {
  route: string;
  modals: Record<string, boolean>;
  timestamp: number;
}

const STORAGE_KEY = 'navigation_state';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

// Public routes that should not be restored
const EXCLUDED_ROUTES = ['/auth', '/reset-password', '/onboarding', '/privacy'];

export function useNavigationPersist() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRestoredRef = useRef(false);
  const modalsRef = useRef<Record<string, boolean>>({});

  // Save current navigation state
  const saveState = useCallback(() => {
    const currentRoute = location.pathname;
    
    // Don't save excluded routes
    if (EXCLUDED_ROUTES.some(r => currentRoute.startsWith(r))) {
      return;
    }

    const state: NavigationState = {
      route: currentRoute,
      modals: modalsRef.current,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save navigation state:', error);
    }
  }, [location.pathname]);

  // Register a modal state
  const registerModal = useCallback((modalId: string, isOpen: boolean) => {
    modalsRef.current = {
      ...modalsRef.current,
      [modalId]: isOpen,
    };
    
    // Save immediately when modal state changes
    const currentRoute = location.pathname;
    if (!EXCLUDED_ROUTES.some(r => currentRoute.startsWith(r))) {
      const state: NavigationState = {
        route: currentRoute,
        modals: modalsRef.current,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to save modal state:', error);
      }
    }
  }, [location.pathname]);

  // Get modal state for restoration
  const getModalState = useCallback((modalId: string): boolean => {
    return modalsRef.current[modalId] ?? false;
  }, []);

  // Clear navigation state
  const clearState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    modalsRef.current = {};
  }, []);

  // Restore navigation on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const state: NavigationState = JSON.parse(stored);
      
      // Check if state is still valid (not too old)
      if (Date.now() - state.timestamp > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Don't restore if already on the saved route or on an excluded route
      const currentRoute = location.pathname;
      if (currentRoute === state.route) {
        // Just restore modal states
        modalsRef.current = state.modals;
        return;
      }

      if (EXCLUDED_ROUTES.some(r => currentRoute.startsWith(r))) {
        return;
      }

      // Restore the route and modal states
      modalsRef.current = state.modals;
      
      // Only navigate if we're on the home page and have a different saved route
      if (currentRoute === '/' && state.route !== '/') {
        navigate(state.route, { replace: true });
        
        toast.info('Voltando para onde você estava', {
          description: 'Sua sessão foi restaurada automaticamente.',
          duration: 3000,
        });
      }
    } catch (error) {
      console.warn('Failed to restore navigation state:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [location.pathname, navigate]);

  // Save state on route changes
  useEffect(() => {
    saveState();
  }, [saveState]);

  // Save state on visibility change (when user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveState]);

  // Save state before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState]);

  return {
    registerModal,
    getModalState,
    clearState,
  };
}

// Context for sharing navigation persist across components
import { createContext, useContext } from 'react';

interface NavigationPersistContextValue {
  registerModal: (modalId: string, isOpen: boolean) => void;
  getModalState: (modalId: string) => boolean;
  clearState: () => void;
}

export const NavigationPersistContext = createContext<NavigationPersistContextValue | null>(null);

export function useNavigationPersistContext() {
  const context = useContext(NavigationPersistContext);
  if (!context) {
    // Return a no-op version if not in provider
    return {
      registerModal: () => {},
      getModalState: () => false,
      clearState: () => {},
    };
  }
  return context;
}
