import type { Metadata } from "next"
import "./globals.css"
export const metadata: Metadata = { title: "Matriz Client Admin", description: "Acompanhamento simples e confiável para clientes Matriz." }
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html> }
