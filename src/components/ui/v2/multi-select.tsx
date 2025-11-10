import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Badge } from "./badge";

export type MultiSelectOption = {
  id: string;
  label: string;
};

export interface MultiSelectProps {
  value: MultiSelectOption[];
  onChange: (value: MultiSelectOption[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  appearance?: "outline" | "filled";
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  inputClassName,
  appearance = "outline",
}: MultiSelectProps) {
  const [query, setQuery] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const appearanceStyles: Record<NonNullable<MultiSelectProps["appearance"]>, string> = {
    outline: "border border-[var(--border-color-regular)] bg-[var(--c-bacPri)]",
    filled:
      "border border-[var(--border-color-regular)] bg-[var(--input-background)]",
  };

  const availableOptions = React.useMemo(() => {
    const selectedIds = new Set(value.map((item) => item.id));
    return options.filter(
      (option) =>
        !selectedIds.has(option.id) &&
        option.label.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [options, query, value]);

  React.useEffect(() => {
    function handleClickAway(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  function addOption(option: MultiSelectOption) {
    if (disabled) return;
    const alreadySelected = value.some((item) => item.id === option.id);
    if (alreadySelected) return;
    onChange([...value, option]);
    setQuery("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function removeOption(optionId: string) {
    if (disabled) return;
    onChange(value.filter((item) => item.id !== optionId));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (availableOptions.length > 0) {
        addOption(availableOptions[0]);
      }
    } else if (event.key === "Backspace" && !query && value.length > 0) {
      removeOption(value[value.length - 1].id);
    }
  }

  return (
    <div
      ref={containerRef}
        className={cn(
        "relative flex min-h-[44px] w-full flex-wrap gap-2 rounded-lg p-2 transition-colors focus-within:border-[var(--c-palUiBlu500)] focus-within:ring-1 focus-within:ring-[var(--c-palUiBlu200)]",
        appearanceStyles[appearance],
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      onClick={() => {
        if (disabled) return;
        setShowDropdown(true);
        inputRef.current?.focus();
      }}
    >
      {value.map((item) => (
        <Badge
          key={item.id}
          variant="secondary"
          className="flex items-center gap-1 rounded-full bg-[var(--ca-palUiBlu100)] px-3 py-1 text-xs text-[var(--c-palUiBlu700)]"
        >
          <span>{item.label}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeOption(item.id);
              }}
              className="flex size-4 items-center justify-center rounded-full text-[var(--c-palUiBlu700)] transition-colors hover:bg-[var(--c-palUiBlu200)]"
              aria-label={`Remove ${item.label}`}
            >
              <X className="size-3" />
            </button>
          )}
        </Badge>
      ))}

      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setShowDropdown(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : undefined}
        className={cn(
          "flex-1 min-w-[160px] border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
          inputClassName
        )}
      />

      {showDropdown && availableOptions.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border-color-regular)] bg-white text-sm shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <ul className="max-h-56 overflow-y-auto py-1">
            {availableOptions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[var(--c-texPri)] transition-colors hover:bg-[var(--c-bacSec)]"
                  onClick={() => addOption(option)}
                >
                  <span>{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


