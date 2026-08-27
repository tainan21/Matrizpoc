"use client"
import Link from "next/link"
import { useProjectHost } from "./project-host-context"
export function ProjectHomeSummary() { const host=useProjectHost(); return <section className="project-home-summary"><header><span>PROJECT HOST</span><Link href="/apps">Gerenciar →</Link></header>{host.loading?<p>Carregando projetos externos…</p>:host.projects.length?host.projects.slice(0,4).map(project=><Link href="/apps" key={project.id}><b>{project.name}</b><span>{project.stateLabel}</span></Link>):<p>Nenhum projeto externo registrado.</p>}</section> }
