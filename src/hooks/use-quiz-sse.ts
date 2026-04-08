"use client";

import { useEffect, useRef } from "react";

type SSEHandler = (event: string, data: unknown) => void;

export function useQuizSSE(quizId: string | null, onEvent: SSEHandler) {
  const onEventRef = useRef(onEvent);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback ref up-to-date via effect
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!quizId) return;

    let es: EventSource | null = null;
    let closed = false;

    function open() {
      if (closed) return;
      es = new EventSource(`/api/sse/${quizId}`);

      const events = [
        "connected",
        "quiz:started",
        "question:active",
        "question:revealed",
        "leaderboard:update",
        "quiz:ended",
        "team:joined",
      ];

      events.forEach((evt) => {
        es!.addEventListener(evt, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onEventRef.current(evt, data);
          } catch {
            onEventRef.current(evt, e.data);
          }
        });
      });

      es.onerror = () => {
        es?.close();
        if (!closed) {
          reconnectTimer.current = setTimeout(open, 2000);
        }
      };
    }

    open();

    return () => {
      closed = true;
      es?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [quizId]);
}
