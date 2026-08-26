"use client"
import { useEffect, useMemo, useState } from "react"
import type { DoctorViewModel } from "../doctor/doctor-presenter"
import { useTerminal } from "../terminal/terminal-context"
export function WorkspacePage() {
  const [doctor,setDoctor]=useState<DoctorViewModel|null>(null); const [filter,setFilter]=useState("all"); const terminal=useTerminal()
  useEffect(()=>{void fetch("/api/doctor").then(r=>r.json()).then((v:DoctorViewModel)=>setDoctor(v))},[])
  const rows=useMemo(()=>doctor?.projects.map(project=>({ ...project, session:terminal.sessions.find(s=>s.projectId===project.id) })) .filter(row=>filter==="all"||(filter==="running"&&row.session&&["running","starting"].includes(row.session.status))||(filter==="attention"&&["warning","critical"].includes(row.status)))??[],[doctor,filter,terminal.sessions])
  return <main className="page"><div className="page-title"><span className="section-label">WORKSPACE / OPERACIONAL</span><h1>Workspace</h1><p>Projetos, recursos e processos em uma única visão.</p></div><div className="workspace-filters">{["all","running","attention"].map(id=><button className={filter===id?"primary":""} key={id} onClick={()=>setFilter(id)}>{id}</button>)}</div><section className="panel workspace-table">{rows.map(row=><article key={row.id}><span><strong>{row.name}</strong><small>{row.route}</small></span><b>{row.statusLabel}</b><span>{row.total} · cache {row.cache}</span><span>{row.memory} ram</span><span>{row.branch??"git indisponível"}{row.dirty?" *":""}</span><span>{row.session?.status??"stopped"} · {row.session?.validationLabel??"não executada"}</span></article>)}{!rows.length?<p className="muted">Nenhum projeto neste filtro.</p>:null}</section></main>
}
