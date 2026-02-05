"use client";

import { useEffect } from "react";

interface UseKeyboardOptions {
  enabled: boolean;
  optionIds: string[];
  onSelectOption: (optionId: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function useKeyboard({ enabled, optionIds, onSelectOption, onSubmit, onBack }: UseKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        onBack();
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const optionId = optionIds[index];
        if (optionId) {
          event.preventDefault();
          onSelectOption(optionId);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onBack, onSelectOption, onSubmit, optionIds]);
}
