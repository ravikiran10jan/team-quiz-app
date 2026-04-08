"use client";

import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";

interface CountdownState {
  timeLeft: number;
  isExpired: boolean;
  fraction: number;
}

export function useCountdown(
  startedAt: string | null,
  timeLimitSec: number
): CountdownState {
  const storeRef = useRef<{
    state: CountdownState;
    listeners: Set<() => void>;
    interval: ReturnType<typeof setInterval> | null;
  }>({
    state: { timeLeft: timeLimitSec, isExpired: false, fraction: 1 },
    listeners: new Set(),
    interval: null,
  });

  // Set up / tear down the interval whenever inputs change
  useEffect(() => {
    const store = storeRef.current;

    if (store.interval) {
      clearInterval(store.interval);
      store.interval = null;
    }

    if (!startedAt) {
      store.state = { timeLeft: timeLimitSec, isExpired: false, fraction: 1 };
      store.listeners.forEach((l) => l());
      return;
    }

    const endTime = new Date(startedAt).getTime() + timeLimitSec * 1000;

    const tick = () => {
      const remaining = Math.max(0, endTime - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      const fraction = timeLimitSec > 0 ? seconds / timeLimitSec : 0;
      store.state = { timeLeft: seconds, isExpired: remaining <= 0, fraction };
      store.listeners.forEach((l) => l());

      if (remaining <= 0 && store.interval) {
        clearInterval(store.interval);
        store.interval = null;
      }
    };

    tick();
    store.interval = setInterval(tick, 100);

    return () => {
      if (store.interval) {
        clearInterval(store.interval);
        store.interval = null;
      }
    };
  }, [startedAt, timeLimitSec]);

  const subscribe = useCallback((listener: () => void) => {
    storeRef.current.listeners.add(listener);
    return () => {
      storeRef.current.listeners.delete(listener);
    };
  }, []);

  const getSnapshot = useCallback(() => storeRef.current.state, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
