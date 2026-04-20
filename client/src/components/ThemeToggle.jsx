import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "peersync-theme";

function applyTheme(nextTheme) {
  document.documentElement.classList.toggle("light-theme", nextTheme === "light");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY) || "dark";
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <Sun className="theme-toggle-icon" />
      ) : (
        <Moon className="theme-toggle-icon" />
      )}
    </button>
  );
}
