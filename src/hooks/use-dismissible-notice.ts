import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DURATION_MS = 4500;

export const useDismissibleNotice = (durationMs = DEFAULT_DURATION_MS) => {
  const [notice, setNotice] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (message: string) => {
      clearTimer();
      setNotice(message);
      timeoutRef.current = setTimeout(() => {
        setNotice(null);
        timeoutRef.current = null;
      }, durationMs);
    },
    [clearTimer, durationMs],
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setNotice(null);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { notice, showNotice, dismiss };
};
