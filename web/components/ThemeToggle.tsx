"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        // Standard next-themes hydration guard: render a stable placeholder until
        // mounted so server and client markup match. The one-time setState is intentional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            {/* Show Sun in dark mode (click → go light), Moon in light mode (click → go dark) */}
            {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">
                {resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            </span>
        </button>
    )
}
