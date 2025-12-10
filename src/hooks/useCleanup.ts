import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook for managing intervals with automatic cleanup
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = window.setInterval(tick, delay);

    return () => window.clearInterval(id);
  }, [delay]);
}

/**
 * Hook for managing timeouts with automatic cleanup
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = window.setTimeout(() => savedCallback.current(), delay);

    return () => window.clearTimeout(id);
  }, [delay]);
}

/**
 * Hook for managing animation frames with automatic cleanup
 */
export function useAnimationFrame(callback: (deltaTime: number) => void, isRunning: boolean = true) {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isRunning) {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      previousTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = time - previousTimeRef.current;
        callbackRef.current(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning]);
}

/**
 * Hook for managing multiple cleanups in a component
 */
export function useCleanupRegistry() {
  const cleanups = useRef<Set<() => void>>(new Set());

  const register = useCallback((cleanup: () => void) => {
    cleanups.current.add(cleanup);
    return () => {
      cleanups.current.delete(cleanup);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanups.current.forEach(cleanup => {
        try {
          cleanup();
        } catch {
          // Ignore cleanup errors
        }
      });
      cleanups.current.clear();
    };
  }, []);

  return register;
}

/**
 * Hook for debounced values with cleanup
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled callbacks with cleanup
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const throttledFn = useCallback((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      return callbackRef.current(...args);
    } else if (timeoutRef.current === null) {
      timeoutRef.current = window.setTimeout(() => {
        lastRun.current = Date.now();
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, delay - (now - lastRun.current));
    }
  }, [delay]) as T;

  return throttledFn;
}

