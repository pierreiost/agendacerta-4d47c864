import { useState, useCallback, useEffect } from 'react';
import { useVenue } from '@/contexts/VenueContext';

interface UseTabPersistOptions {
  /**
   * Unique key for this tab group (e.g., 'configuracoes', 'financeiro')
   */
  key: string;
  /**
   * Default tab value if no persisted state exists
   */
  defaultValue: string;
  /**
   * Whether to scope the key to the current venue (default: true)
   */
  scopeToVenue?: boolean;
}

/**
 * Hook to persist tab selection across page reloads and tab switches
 */
export function useTabPersist({ key, defaultValue, scopeToVenue = true }: UseTabPersistOptions) {
  const { currentVenue } = useVenue();
  
  const getStorageKey = useCallback(() => {
    if (scopeToVenue && currentVenue?.id) {
      return `tab_${key}_${currentVenue.id}`;
    }
    return `tab_${key}`;
  }, [key, scopeToVenue, currentVenue?.id]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    // Try to restore from localStorage on initial render
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const storageKey = scopeToVenue && currentVenue?.id 
        ? `tab_${key}_${currentVenue.id}` 
        : `tab_${key}`;
      const stored = localStorage.getItem(storageKey);
      return stored || defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Re-read from storage when venue changes
  useEffect(() => {
    if (!scopeToVenue || !currentVenue?.id) return;
    
    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setActiveTab(stored);
      } else {
        setActiveTab(defaultValue);
      }
    } catch {
      setActiveTab(defaultValue);
    }
  }, [currentVenue?.id, scopeToVenue, getStorageKey, defaultValue]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, value);
    } catch (error) {
      console.warn('Failed to persist tab state:', error);
    }
  }, [getStorageKey]);

  return {
    activeTab,
    onTabChange: handleTabChange,
  };
}
