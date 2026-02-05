"use client";

interface OtherInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function OtherInput({ value, onChange, placeholder }: OtherInputProps) {
  return (
    <input
      className="mt-2 w-full rounded-[var(--corner-radius-small)] border border-[var(--app-border-color)] bg-[var(--app-tertiary-background)] px-2 py-1 text-xs text-[var(--app-primary-foreground)]"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={400}
    />
  );
}
