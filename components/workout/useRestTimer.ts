import { useCallback, useEffect, useRef, useState } from "react";

import { useCountdownOnComplete } from "@/lib/useCountdownOnComplete";

const REST_STORAGE_PREFIX = "gym-app:rest:";

export function useRestTimer(workoutId: string, readOnly: boolean) {
  const restStorageKey = `${REST_STORAGE_PREFIX}${workoutId}`;

  const [restEndAt, setRestEndAt] = useState<number | null>(() => {
    if (typeof window === "undefined" || readOnly) return null;
    const raw = window.sessionStorage.getItem(restStorageKey);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > Date.now() ? parsed : null;
  });
  const [restLabel, setRestLabel] = useState("");
  const restLabelRef = useRef("");

  const playRestAlert = useCallback(() => {
    try {
      const AudioContextConstructor =
        window.AudioContext ||
        ((window as unknown as Record<string, unknown>)
          .webkitAudioContext as typeof window.AudioContext);
      const audioContext = new AudioContextConstructor();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1,
      );
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio context not available
    }

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Rest complete", {
        body: restLabelRef.current || "Time to lift",
        tag: "rest-timer",
      });
    }
  }, []);

  const stopRestTimer = useCallback(() => {
    setRestEndAt(null);
    window.sessionStorage.removeItem(restStorageKey);
  }, [restStorageKey]);

  const onRestComplete = useCallback(() => {
    playRestAlert();
    setRestEndAt(null);
    window.sessionStorage.removeItem(restStorageKey);
  }, [playRestAlert, restStorageKey]);

  const restRemaining = useCountdownOnComplete(restEndAt, onRestComplete);

  const startRestTimer = useCallback(
    (seconds: number, label: string) => {
      if (readOnly || seconds <= 0) return;
      const endAt = Date.now() + seconds * 1000;
      restLabelRef.current = label;
      setRestLabel(label);
      setRestEndAt(endAt);
      window.sessionStorage.setItem(restStorageKey, String(endAt));
    },
    [readOnly, restStorageKey],
  );

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return {
    restEndAt,
    restLabel,
    restRemaining,
    startRestTimer,
    stopRestTimer,
  };
}
