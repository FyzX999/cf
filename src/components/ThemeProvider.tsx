"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Theme, themes, getActiveTheme, applyTheme, getThemeById } from "@/lib/themes";

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  useEffect(() => {
    // Check for saved theme preference
    const savedThemeId = localStorage.getItem("theme");
    
    if (savedThemeId && savedThemeId !== "auto") {
      // Use saved theme
      const savedTheme = getThemeById(savedThemeId);
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Use auto theme (holiday-based)
      const activeTheme = getActiveTheme();
      setCurrentTheme(activeTheme);
      applyTheme(activeTheme);
    }
  }, []);

  const handleSetTheme = (themeId: string) => {
    if (themeId === "auto") {
      const activeTheme = getActiveTheme();
      setCurrentTheme(activeTheme);
      applyTheme(activeTheme);
      localStorage.setItem("theme", "auto");
    } else {
      const newTheme = getThemeById(themeId);
      setCurrentTheme(newTheme);
      applyTheme(newTheme);
      localStorage.setItem("theme", themeId);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        setTheme: handleSetTheme,
        availableThemes: themes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
