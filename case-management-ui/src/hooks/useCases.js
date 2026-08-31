import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "case-management-ui:cases";

function readStoredCases() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Tracks which cases this browser has opened, persisted to localStorage. The backend
 * doesn't expose a "list all process instances" endpoint (it's a generic Camunda REST
 * layer, not case-management-specific), so the docket is a local record of what's been
 * opened from here rather than a global case index.
 */
export function useCases() {
  const [cases, setCases] = useState(readStoredCases);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  }, [cases]);

  const addCase = useCallback((processInstanceId) => {
    setCases((prev) => {
      if (prev.some((c) => c.processInstanceId === processInstanceId)) return prev;
      return [{ processInstanceId, openedAt: Date.now() }, ...prev];
    });
  }, []);

  const removeCase = useCallback((processInstanceId) => {
    setCases((prev) => prev.filter((c) => c.processInstanceId !== processInstanceId));
  }, []);

  return { cases, addCase, removeCase };
}
