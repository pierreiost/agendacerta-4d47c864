import { useEffect, useCallback, useRef } from 'react';
import { UseFormReturn, FieldValues, Path, PathValue } from 'react-hook-form';
import { toast } from 'sonner';

interface UseFormPersistOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  key: string;
  exclude?: (keyof T)[];
  debounceMs?: number;
  showRecoveryToast?: boolean;
}

export function useFormPersist<T extends FieldValues>({
  form,
  key,
  exclude = [],
  debounceMs = 500,
  showRecoveryToast = true,
}: UseFormPersistOptions<T>) {
  const storageKey = `form_draft_${key}`;
  const hasRestoredRef = useRef(false);
  const isDirtyRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore draft on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
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
          let hasData = false;
          
          Object.keys(data).forEach((field) => {
            if (!exclude.includes(field as keyof T)) {
              const value = data[field];
              // Only restore non-empty values
              if (value !== undefined && value !== null && value !== '') {
                form.setValue(field as Path<T>, value as PathValue<T, Path<T>>);
                hasData = true;
              }
            }
          });

          if (hasData && showRecoveryToast) {
            toast.info('Continuando de onde você parou', {
              description: 'Seu rascunho foi recuperado automaticamente.',
              duration: 4000,
            });
          }
          isDirtyRef.current = hasData;
        } else {
          // Clear old drafts
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to restore form draft:', error);
      localStorage.removeItem(storageKey);
    }
  }, [form, storageKey, exclude, showRecoveryToast]);

  // Save draft with debounce
  const saveDraft = useCallback(() => {
    const values = form.getValues();
    const filteredValues: Partial<T> = {};
    
    Object.keys(values).forEach((field) => {
      if (!exclude.includes(field as keyof T)) {
        filteredValues[field as keyof T] = values[field as keyof T];
      }
    });

    // Check if there's any meaningful data
    const hasData = Object.values(filteredValues).some(
      (v) => v !== undefined && v !== null && v !== ''
    );

    if (hasData) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data: filteredValues,
          timestamp: Date.now(),
        })
      );
      isDirtyRef.current = true;
    }
  }, [form, storageKey, exclude]);

  // Watch form changes and auto-save
  useEffect(() => {
    const subscription = form.watch(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(saveDraft, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, saveDraft, debounceMs]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    isDirtyRef.current = false;
  }, [storageKey]);

  // Check if form has unsaved data
  const hasUnsavedData = useCallback(() => {
    return isDirtyRef.current;
  }, []);

  // Prevent page unload with unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    clearDraft,
    hasUnsavedData,
    saveDraft,
  };
}
