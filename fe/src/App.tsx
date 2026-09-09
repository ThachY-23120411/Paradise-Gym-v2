import { useEffect, useState } from "react"
import type { AppSurface, ThemeMode } from "./data"
import { ActionModal, type ActionKind } from "./forms"
import { MobileShell } from "./mobile"
import { WebShell } from "./web"

function getInitialTheme(): ThemeMode {
  const saved = window.localStorage.getItem("paradise-gym-theme")
  return saved === "light" || saved === "dark" ? saved : "light"
}

export default function App() {
  const [surface, setSurface] = useState<AppSurface>("web-admin")
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [action, setAction] = useState<ActionKind | null>(null)
  const openAction = (kind: ActionKind) => setAction(kind)
  const isMobile = surface.startsWith("mobile")

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("paradise-gym-theme", theme)
  }, [theme])

  return (
    <>
      {isMobile ? (
        <MobileShell
          surface={surface}
          theme={theme}
          onSurfaceChange={setSurface}
          onThemeChange={setTheme}
          openAction={openAction}
        />
      ) : (
        <WebShell
          surface={surface}
          theme={theme}
          onSurfaceChange={setSurface}
          onThemeChange={setTheme}
          openAction={openAction}
        />
      )}
      <ActionModal action={action} onClose={() => setAction(null)} />
    </>
  )
}
