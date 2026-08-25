import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ControlShell } from "../src/ui/control-shell"
import "./globals.css"
import "./browser.css"

export const metadata: Metadata = { title: "Matriz Control", description: "Cockpit operacional local do ecossistema Matriz" }
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="pt-BR"><body><ControlShell>{children}</ControlShell></body></html> }
