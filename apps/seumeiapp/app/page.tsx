import Link from "next/link"
import { HomeSummary } from "../src/ui/HomeSummary"

export default function HomePage() {
  return <main className="shell"><header><div className="mark">S</div><strong>SEUMEI</strong><nav><Link href="http://localhost:3000">HUB ↗</Link></nav></header>
    <div className="hero"><span>EMPRESA / AGORA</span><h1>SEU NEGÓCIO,<br />EM MOVIMENTO.</h1></div><HomeSummary />
  </main>
}
