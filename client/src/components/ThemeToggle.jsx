import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "../hooks/use-theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeToggle({ className = "" }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleClick(event) {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className={`theme-toggle-shell ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Theme"
        className="theme-toggle-button"
      >
        <ActiveIcon className="theme-toggle-icon" />
        <ChevronDown className="theme-toggle-chevron" />
      </button>

      {open ? (
        <div role="menu" className="theme-menu">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;

            return (
              <button
                key={option.value}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className="theme-menu-item"
              >
                <span className="theme-menu-label">
                  <Icon className="theme-toggle-icon" />
                  {option.label}
                </span>
                {active ? <Check className="theme-toggle-icon theme-check" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
