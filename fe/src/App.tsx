import { useState } from "react"
import type { AppSurface } from "./data"
import { ActionModal, type ActionKind } from "./forms"
import { MobileShell } from "./mobile"
import { WebShell } from "./web"

export default function App() {
  const [surface, setSurface] = useState<AppSurface>("web-admin")
  const [action, setAction] = useState<ActionKind | null>(null)
  const openAction = (kind: ActionKind) => setAction(kind)
  const isMobile = surface.startsWith("mobile")

  return (
    <>
      {isMobile ? (
        <MobileShell
          surface={surface}
          onSurfaceChange={setSurface}
          openAction={openAction}
        />
      ) : (
        <WebShell
          surface={surface}
          onSurfaceChange={setSurface}
          openAction={openAction}
        />
      )}
      <ActionModal action={action} onClose={() => setAction(null)} />
    </>
  )
}
