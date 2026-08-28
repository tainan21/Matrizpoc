import type { ReactNode } from "react"
import "./globals.css"
export const metadata = { title: "Matriz Ops", description: "Centro de controle interno da plataforma Matriz" }
export default function Layout({ children }: { children: ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html> }
