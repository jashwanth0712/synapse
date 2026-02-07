"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "synapse_my_agent";

export function useMyAgent() {
  const [address, setAddressState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setAddressState(stored);
    setIsLoaded(true);
  }, []);

  const setAddress = useCallback((addr: string) => {
    localStorage.setItem(STORAGE_KEY, addr);
    setAddressState(addr);
  }, []);

  const clearAddress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAddressState(null);
  }, []);

  return { address, setAddress, clearAddress, isLoaded };
}
