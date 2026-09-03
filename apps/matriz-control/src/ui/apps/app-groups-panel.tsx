"use client"

import { useEffect, useMemo, useState } from "react"
import type { TerminalProject } from "../../domain/terminal"
import { APP_GROUPS_STORAGE_KEY, createGroupId, type AppGroup } from "./app-groups"

interface AppGroupPanelProps {
  readonly groups: readonly AppGroup[]
  readonly activeGroupId: string
  readonly projects: readonly TerminalProject[]
  readonly workbenchAvailable: boolean
  readonly onSelect: (groupId: string) => void
  readonly onCreate: (name: string) => void
  readonly onAdd: (projectId: string) => void
}

export function AppGroupPanel({ groups, activeGroupId, projects, workbenchAvailable, onSelect, onCreate, onAdd }: AppGroupPanelProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0]
  const knownProjects = useMemo(() => [...projects.map((project) => project.id), ...(workbenchAvailable ? ["matriz-workbench"] : [])], [projects, workbenchAvailable])
  const available = knownProjects.filter((id) => !activeGroup?.projectIds.includes(id))

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setName("")
    setCreating(false)
  }

  return <section className="app-groups" aria-label="Grupos de apps">
    <div className="app-groups-heading"><span>GRUPOS DE APPS</span><b>{groups.length.toString().padStart(2, "0")}</b></div>
    <div className="app-group-tabs">
      {groups.map((group) => <button type="button" className={group.id === activeGroupId ? "active" : ""} key={group.id} onClick={() => onSelect(group.id)} aria-pressed={group.id === activeGroupId}><span className="group-mark" />{group.name}<small>{group.projectIds.length}</small></button>)}
      <button type="button" className="app-group-new" onClick={() => setCreating((value) => !value)}>+ Novo grupo</button>
    </div>
    {creating ? <form className="app-group-form" onSubmit={submit}><label>Nome do grupo<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Cliente A" autoFocus /></label><button type="submit" className="primary">Criar</button></form> : null}
    {activeGroup && activeGroup.id !== "matriz" ? <div className="app-group-add"><button type="button" onClick={() => setPickerOpen((value) => !value)}>{pickerOpen ? "Fechar seleção" : "+ Adicionar projeto"}</button>{pickerOpen ? <div className="app-group-picker">{available.length ? available.map((id) => <button type="button" key={id} onClick={() => onAdd(id)}>{labelFor(id, projects, workbenchAvailable)} <span>+</span></button>) : <small>Todos os apps já estão neste grupo.</small>}</div> : null}</div> : <p className="app-group-note">Sequência principal · prioridade operacional</p>}
  </section>
}

function labelFor(id: string, projects: readonly TerminalProject[], workbenchAvailable: boolean): string {
  if (id === "matriz-workbench" && workbenchAvailable) return "Matriz Workbench"
  return projects.find((project) => project.id === id)?.name ?? id
}

export function persistAppGroups(groups: readonly AppGroup[]) {
  window.localStorage.setItem(APP_GROUPS_STORAGE_KEY, JSON.stringify(groups))
}

export function nextGroupId(name: string, groups: readonly AppGroup[]): string {
  return createGroupId(name, groups.map((group) => group.id))
}
