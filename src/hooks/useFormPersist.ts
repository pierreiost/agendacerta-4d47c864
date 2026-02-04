import { useEffect, useCallback, useRef } from "react";
import { UseFormReturn, FieldValues, Path, PathValue } from "react-hook-form";
import { toast } from "sonner";

interface UseFormPersistOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  key: string;
  exclude?: (keyof T)[];
  debounceMs?: number;
  showRecoveryToast?: boolean;
  onRestore?: () => void;
}

export function useFormPersist<T extends FieldValues>({
  form,
  key,
  exclude = [],
  debounceMs = 500,
  showRecoveryToast = true,
  onRestore,
}: UseFormPersistOptions<T>) {
  const storageKey = `form_draft_${key}`;
  const hasRestoredRef = useRef(false);
  const isDirtyRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store stable references to avoid dependency issues
  const formRef = useRef(form);
  const onRestoreRef = useRef(onRestore);
  const excludeRef = useRef(exclude);
  
  // Keep refs updated
  formRef.current = form;
  onRestoreRef.current = onRestore;
  excludeRef.current = exclude;

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const data = parsed.data;
        const timestamp = parsed.timestamp;

        const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;

        if (isRecent && data) {
          let hasData = false;

          Object.keys(data).forEach((field) => {
            if (!excludeRef.current.includes(field as keyof T)) {
              const value = data[field];
              if (value !== undefined && value !== null && value !== "") {
                formRef.current.setValue(field as Path<T>, value as PathValue<T, Path<T>>);
                hasData = true;
              }
            }
          });

          if (hasData) {
            if (showRecoveryToast) {
              toast.info("Rascunho recuperado", {
                description: "Continuando de onde você parou.",
                duration: 4000,
              });
            }
            onRestoreRef.current?.();
          }
          isDirtyRef.current = hasData;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, showRecoveryToast]);

  const saveDraft = useCallback(() => {
    const values = formRef.current.getValues();
    const filteredValues: Partial<T> = {};

    Object.keys(values).forEach((field) => {
      if (!excludeRef.current.includes(field as keyof T)) {
        filteredValues[field as keyof T] = values[field as keyof T];
      }
    });

    const hasData = Object.values(filteredValues).some((v) => v !== undefined && v !== null && v !== "");

    if (hasData) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data: filteredValues,
          timestamp: Date.now(),
        }),
      );
      isDirtyRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    const subscription = formRef.current.watch(() => {
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
  }, [saveDraft, debounceMs]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    isDirtyRef.current = false;
  }, [storageKey]);

  const hasUnsavedData = useCallback(() => {
    return isDirtyRef.current;
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return {
    clearDraft,
    hasUnsavedData,
    saveDraft,
  };
}
