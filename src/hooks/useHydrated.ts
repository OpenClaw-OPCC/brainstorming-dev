"use client";

import { useSyncExternalStore } from "react";

export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
