"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
}

function applyTheme(theme: Theme) {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    const root = document.documentElement;

    if (resolved === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
}

export function useDarkMode() {
    const [theme, setThemeState] = useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);

    // Initialize on mount
    useEffect(() => {
        const stored = getStoredTheme();
        setThemeState(stored);
        applyTheme(stored);
        setResolvedTheme(
            stored === "system" ? getSystemTheme() : stored
        );
        setMounted(true);
    }, []);

    // Listen for system theme changes
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            if (getStoredTheme() === "system") {
                applyTheme("system");
                setResolvedTheme(getSystemTheme());
            }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("theme", newTheme);
        applyTheme(newTheme);
        setResolvedTheme(
            newTheme === "system" ? getSystemTheme() : newTheme
        );
    }, []);

    const toggleTheme = useCallback(() => {
        const next =
            resolvedTheme === "light" ? "dark" : "light";
        setTheme(next);
    }, [resolvedTheme, setTheme]);

    return {
        theme,
        resolvedTheme,
        mounted,
        setTheme,
        toggleTheme,
        isDark: resolvedTheme === "dark",
    };
}
