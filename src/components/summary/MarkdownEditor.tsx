"use client";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <textarea
      className="h-full w-full resize-none rounded-[var(--corner-radius-medium)] border border-[var(--app-border-color)] bg-[var(--app-secondary-background)] p-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
