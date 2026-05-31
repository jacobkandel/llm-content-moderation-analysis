"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="p-2.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                <Sun className="h-5 w-5" />
                <span className="sr-only">Toggle theme</span>
            </button>
        )
    }

    return (
        <button
            className="p-2.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            {/* Show Sun in dark mode (click → go light), Moon in light mode (click → go dark) */}
            {theme === "dark" ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">
                {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            </span>
        </button>
    )
}
