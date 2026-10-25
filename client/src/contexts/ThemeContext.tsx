/* Quiet Signal dual theme: every screen receives the same semantic tokens, preserving hierarchy in dark ember and light blue modes. */
import React, { createContext, useContext, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/brand";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = STORAGE_KEYS.theme;

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

function getInitialTheme(defaultTheme: Theme, switchable: boolean): Theme {
  if (!switchable || typeof window === "undefined") return defaultTheme;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return defaultTheme;
}

export function ThemeProvider({ children, defaultTheme = "dark", switchable = false }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(defaultTheme, switchable));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.style.colorScheme = theme;
    if (switchable) window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, switchable]);

  const toggleTheme = switchable ? () => setTheme((current) => (current === "light" ? "dark" : "light")) : undefined;

  return <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
