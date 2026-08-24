"use client"

import Link from "next/link"
import { HubIcon } from "./icons"
import { HUB_NAV_GROUPS } from "./navigation"

interface OperationalNavProps {
  readonly pathname: string
  readonly collapsed: boolean
  readonly onNavigate: () => void
  readonly onToggleCollapsed: () => void
}

export function OperationalNav({
  pathname,
  collapsed,
  onNavigate,
  onToggleCollapsed,
}: OperationalNavProps) {
  return (
    <nav className="hub-operational-nav" aria-label="Navegação operacional">
      <div className="hub-operational-nav__scroll">
        {HUB_NAV_GROUPS.map((group) => (
          <section className="hub-nav-group" key={group.id} aria-labelledby={`hub-nav-${group.id}`}>
            <h2 className="hub-nav-group__label" id={`hub-nav-${group.id}`}>
              {group.label}
            </h2>
            <div className="hub-nav-group__items">
              {group.items.map((item) => {
                const active = item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className="hub-nav-item"
                    href={item.href}
                    key={item.href}
                    onClick={onNavigate}
                    title={collapsed ? `${item.label} — ${item.description}` : undefined}
                  >
                    <span className="hub-nav-item__icon">
                      <HubIcon name={item.icon} size={18} />
                    </span>
                    <span className="hub-nav-item__copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="hub-operational-nav__footer">
        <button
          aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
          className="hub-nav-toggle"
          onClick={onToggleCollapsed}
          type="button"
        >
          <HubIcon
            name="chevron"
            size={16}
            style={{ rotate: collapsed ? "0deg" : "180deg" }}
          />
        </button>
      </footer>
    </nav>
  )
}
