// done
"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: string;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const savedTheme = localStorage.getItem("theme");
            if (savedTheme) { setTheme(savedTheme); }
            else if (window.matchMedia("(prefers-color-scheme: light)").matches) { setTheme("light"); }
        }
        catch {
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        try { localStorage.setItem("theme", theme); }
        catch { }
    }, [theme, mounted]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
