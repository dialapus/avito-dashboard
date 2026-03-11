import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAllData } from "../lib/api";

const INTERVAL = 60_000;

export function useAutoRefresh() {
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(INTERVAL / 1000);
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const resetCountdown = useCallback(() => {
    setSecondsLeft(INTERVAL / 1000);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const newData = await fetchAllData();
      setPrevData((prev) => prev || newData);
      setData((current) => {
        if (current) setPrevData(current);
        return newData;
      });
      setLastUpdate(new Date());
      setIsOnline(true);
      resetCountdown();
    } catch (e) {
      console.error("[refresh] failed:", e);
      setIsOnline(false);
    }
  }, [resetCountdown]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, INTERVAL);
    return () => {
      clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [refresh]);

  return { data, prevData, lastUpdate, secondsLeft, isOnline, refresh };
}
