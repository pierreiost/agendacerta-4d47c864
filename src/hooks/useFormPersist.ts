import { useEffect, useCallback, useRef } from "react";
import { UseFormReturn, FieldValues, Path, PathValue } from "react-hook-form";
import { toast } from "sonner";

interface UseFormPersistOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  key: string;
  exclude?: (keyof T)[];
  debounceMs?: number;
  showRecoveryToast?: boolean;
  isEnabled?: boolean;
}

export function useFormPersist<T extends FieldValues>({
  form,
  key,
  exclude = [],
  debounceMs = 500,
  showRecoveryToast = true,
  isEnabled = true,
}: UseFormPersistOptions<T>) {
  const storageKey = `form_draft_${key}`;
  // Usamos um Set para rastrear quais chaves já foram restauradas nesta sessão
  const restoredKeysRef = useRef<Set<string>>(new Set());
  const isDirtyRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore draft
  useEffect(() => {
    if (!isEnabled) return;
    // Se já restauramos esta chave específica, não fazemos de novo para evitar loops
    if (restoredKeysRef.current.has(storageKey)) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const data = parsed.data;
        const timestamp = parsed.timestamp;

        // Rascunho válido por 24h
        const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;

        if (isRecent && data) {
          let hasData = false;

          Object.keys(data).forEach((field) => {
            if (!exclude.includes(field as keyof T)) {
              const value = data[field];
              if (value !== undefined && value !== null && value !== "") {
                form.setValue(field as Path<T>, value as PathValue<T, Path<T>>, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                });
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
            isDirtyRef.current = true;
          }
        } else {
          localStorage.removeItem(storageKey);
        }
      }
      // Marca como restaurado
      restoredKeysRef.current.add(storageKey);
    } catch (error) {
      console.error("Erro ao restaurar rascunho:", error);
      localStorage.removeItem(storageKey);
    }
  }, [form, storageKey, exclude, showRecoveryToast, isEnabled]);

  // Save draft
  const saveDraft = useCallback(() => {
    if (!isEnabled) return;

    const values = form.getValues();
    const filteredValues: Partial<T> = {};

    Object.keys(values).forEach((field) => {
      if (!exclude.includes(field as keyof T)) {
        filteredValues[field as keyof T] = values[field as keyof T];
      }
    });

    // Verifica se tem dados relevantes
    const hasData = Object.values(filteredValues).some(
      (v) => v !== undefined && v !== null && v !== "" && (Array.isArray(v) ? v.length > 0 : true),
    );

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
  }, [form, storageKey, exclude, isEnabled]);

  // Watch changes
  useEffect(() => {
    if (!isEnabled) return;

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
  }, [form, saveDraft, debounceMs, isEnabled]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    isDirtyRef.current = false;
  }, [storageKey]);

  // Warn on exit
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
    saveDraft,
  };
}
