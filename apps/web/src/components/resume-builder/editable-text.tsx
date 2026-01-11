"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  disabled?: boolean;
}

export function EditableText({
  value,
  onChange,
  placeholder = "Click to edit",
  className,
  inputClassName,
  multiline = false,
  disabled = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (disabled) {
    return (
      <span className={cn("text-zinc-400", className)}>
        {value || placeholder}
      </span>
    );
  }

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <InputComponent
        ref={inputRef as any}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded border px-2 py-1 outline-none hover:border-emerald-500 focus:border-emerald-500",
          multiline && "min-h-[60px] resize-y",
          inputClassName,
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-text rounded px-1 hover:bg-primary/10",
        !value && "italic",
        className,
      )}
    >
      {value || placeholder}
    </span>
  );
}
