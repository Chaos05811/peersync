import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "peersync.theme";

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyResolvedTheme(resolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
}

export function useTheme() {
  const [theme, setThemeState] = useState("system");
  const [resolvedTheme, setResolvedTheme] = useState("light");

  useEffect(() => {
    const storedTheme =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const initialTheme = storedTheme || "system";
    const initialResolvedTheme =
      initialTheme === "system" ? getSystemTheme() : initialTheme;

    setThemeState(initialTheme);
    setResolvedTheme(initialResolvedTheme);
    applyResolvedTheme(initialResolvedTheme);
  }, []);

  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") {
      return undefined;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange() {
      const nextResolvedTheme = query.matches ? "dark" : "light";
      setResolvedTheme(nextResolvedTheme);
      applyResolvedTheme(nextResolvedTheme);
    }

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme) => {
    const nextResolvedTheme = nextTheme === "system" ? getSystemTheme() : nextTheme;

    setThemeState(nextTheme);
    setResolvedTheme(nextResolvedTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyResolvedTheme(nextResolvedTheme);
  }, []);

  return { theme, resolvedTheme, setTheme };
}
