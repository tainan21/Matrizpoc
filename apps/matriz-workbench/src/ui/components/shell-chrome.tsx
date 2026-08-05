"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react"
import {
  canAutoHideTopbar,
  createRailPreferenceCookie,
  createTopbarPreferenceCookie,
  selectActiveShellHref,
  type RailPreference,
  type TopbarPreference,
} from "../shell-preferences"
import styles from "./shell-chrome.module.css"

export interface ShellNavigationItem {
  activePrefixes?: readonly string[]
  href: string
  icon: string
  label: string
  indicator?: "ready" | "idle"
  warning?: string
}

interface ShellChromeProps {
  children: ReactNode
  initialRailPreference: RailPreference
  initialTopbarPreference: TopbarPreference
  lockAction: () => Promise<void>
  primaryNavigation: readonly ShellNavigationItem[]
  projectNavigation: readonly ShellNavigationItem[]
  secondaryNavigation: readonly ShellNavigationItem[]
  topbar: ReactNode
}

const RAIL_ID = "workbench-navigation"
const TOPBAR_ID = "workbench-topbar"

export function ShellChrome({
  children,
  initialRailPreference,
  initialTopbarPreference,
  lockAction,
  primaryNavigation,
  projectNavigation,
  secondaryNavigation,
  topbar,
}: ShellChromeProps) {
  const pathname = usePathname()
  const [railPreference, setRailPreference] = useState(initialRailPreference)
  const [railPreview, setRailPreview] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [topbarPreference, setTopbarPreference] = useState(initialTopbarPreference)
  const [topbarRevealed, setTopbarRevealed] = useState(true)
  const [autoHideAvailable, setAutoHideAvailable] = useState(false)
  const [smallViewportLayout, setSmallViewportLayout] = useState(false)
  const railRef = useRef<HTMLElement>(null)
  const railTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const topbarRef = useRef<HTMLElement>(null)
  const topbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLButtonElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)

  const railExpanded = railPreference === "expanded" || railPreview || mobileOpen
  const topbarVisible = topbarPreference === "pinned" || !autoHideAvailable || topbarRevealed
  const allNavigation = [...primaryNavigation, ...projectNavigation, ...secondaryNavigation]
  const activeMatch = selectActiveShellHref(
    pathname,
    allNavigation.flatMap((item) => [item.href, ...(item.activePrefixes ?? [])]),
  )
  const activeHref = allNavigation.find((item) =>
    activeMatch === item.href || item.activePrefixes?.includes(activeMatch ?? ""),
  )?.href

  const clearRailTimer = useCallback(() => {
    if (railTimerRef.current) clearTimeout(railTimerRef.current)
    railTimerRef.current = null
  }, [])

  const clearTopbarTimer = useCallback(() => {
    if (topbarTimerRef.current) clearTimeout(topbarTimerRef.current)
    topbarTimerRef.current = null
  }, [])

  const hideTopbarLater = useCallback(() => {
    if (topbarPreference !== "auto" || !autoHideAvailable) return
    clearTopbarTimer()
    topbarTimerRef.current = setTimeout(() => {
      if (!topbarRef.current?.contains(document.activeElement)) setTopbarRevealed(false)
    }, 500)
  }, [autoHideAvailable, clearTopbarTimer, topbarPreference])

  useEffect(() => {
    const hover = window.matchMedia("(hover: hover)")
    const finePointer = window.matchMedia("(pointer: fine)")
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const smallViewport = window.matchMedia("(max-width: 720px)")
    const update = () => {
      const available = canAutoHideTopbar({
        hover: hover.matches,
        finePointer: finePointer.matches,
        reducedMotion: reducedMotion.matches,
        smallViewport: smallViewport.matches,
      })
      setAutoHideAvailable(available)
      setSmallViewportLayout(smallViewport.matches)
      if (!available) setTopbarRevealed(true)
    }
    update()
    const queries = [hover, finePointer, reducedMotion, smallViewport]
    queries.forEach((query) => query.addEventListener("change", update))
    return () => queries.forEach((query) => query.removeEventListener("change", update))
  }, [])

  useEffect(() => {
    if (topbarPreference !== "auto" || !autoHideAvailable) return
    clearTopbarTimer()
    topbarTimerRef.current = setTimeout(() => setTopbarRevealed(false), 1200)
    return clearTopbarTimer
  }, [autoHideAvailable, clearTopbarTimer, topbarPreference])

  useEffect(() => () => {
    clearRailTimer()
    clearTopbarTimer()
  }, [clearRailTimer, clearTopbarTimer])

  useEffect(() => {
    function closeTemporaryChrome(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      if (mobileOpen) {
        setMobileOpen(false)
        mobileTriggerRef.current?.focus()
      } else if (railPreference === "collapsed" && railPreview) {
        setRailPreview(false)
      } else if (topbarPreference === "auto" && autoHideAvailable && topbarRevealed) {
        sentinelRef.current?.focus()
        setTopbarRevealed(false)
      }
    }
    window.addEventListener("keydown", closeTemporaryChrome)
    return () => window.removeEventListener("keydown", closeTemporaryChrome)
  }, [autoHideAvailable, mobileOpen, railPreference, railPreview, topbarPreference, topbarRevealed])

  function toggleRailPreference() {
    const next = railPreference === "expanded" ? "collapsed" : "expanded"
    clearRailTimer()
    setRailPreview(false)
    setRailPreference(next)
    document.cookie = createRailPreferenceCookie(next)
  }

  function toggleTopbarPreference() {
    const next = topbarPreference === "pinned" ? "auto" : "pinned"
    clearTopbarTimer()
    setTopbarRevealed(true)
    setTopbarPreference(next)
    document.cookie = createTopbarPreferenceCookie(next)
  }

  function previewRail(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || railPreference !== "collapsed") return
    clearRailTimer()
    railTimerRef.current = setTimeout(() => setRailPreview(true), 140)
  }

  function dismissRailPreview() {
    if (railPreference !== "collapsed") return
    clearRailTimer()
    railTimerRef.current = setTimeout(() => {
      if (!railRef.current?.contains(document.activeElement)) setRailPreview(false)
    }, 260)
  }

  function focusRail() {
    if (railPreference === "collapsed") {
      clearRailTimer()
      setRailPreview(true)
    }
  }

  function blurRail(event: FocusEvent<HTMLElement>) {
    if (railPreference === "collapsed" && !event.currentTarget.contains(event.relatedTarget)) {
      dismissRailPreview()
    }
  }

  function revealTopbar() {
    clearTopbarTimer()
    setTopbarRevealed(true)
  }

  function closeMobileNavigation() {
    setMobileOpen(false)
    if (railPreference === "collapsed") setRailPreview(false)
  }

  function renderNavigation(items: readonly ShellNavigationItem[]) {
    return items.map((item) => (
      <Link
        aria-current={activeHref === item.href ? "page" : undefined}
        aria-label={item.label}
        href={item.href}
        key={item.href}
        onClick={closeMobileNavigation}
        title={railExpanded ? undefined : item.label}
      >
        {item.indicator ? (
          <span
            aria-hidden="true"
            className={`project-dot ${item.indicator === "ready" ? "ready" : ""} ${styles.projectDot}`}
          />
        ) : (
          <span aria-hidden="true" className={`rail-icon ${styles.navIcon}`}>{item.icon}</span>
        )}
        <span className={`${styles.navLabel} truncate`}>{item.label}</span>
        {item.warning ? (
          <span aria-label={item.warning} className={`danger ${styles.warning}`} title={item.warning}>!</span>
        ) : null}
      </Link>
    ))
  }

  return (
    <div
      className={`app-shell ${styles.root}`}
      data-auto-hide={topbarPreference === "auto" && autoHideAvailable}
      data-mobile-open={mobileOpen}
      data-rail-preference={railPreference}
    >
      <a className="skip-link" href="#workspace-content">Pular para o conteúdo</a>
      <button
        aria-controls={TOPBAR_ID}
        aria-expanded={topbarVisible}
        aria-label="Mostrar barra superior"
        className={styles.topbarSentinel}
        onClick={revealTopbar}
        onFocus={revealTopbar}
        onPointerEnter={revealTopbar}
        ref={sentinelRef}
        tabIndex={topbarVisible ? -1 : 0}
        type="button"
      />
      <button
        aria-label="Fechar menu"
        className={styles.mobileBackdrop}
        onClick={() => setMobileOpen(false)}
        tabIndex={mobileOpen ? 0 : -1}
        type="button"
      />
      <aside
        aria-hidden={smallViewportLayout && !mobileOpen ? true : undefined}
        aria-label="Navegação do Workbench"
        className={`project-rail ${styles.rail}`}
        data-expanded={railExpanded}
        id={RAIL_ID}
        inert={smallViewportLayout && !mobileOpen ? true : undefined}
        onBlurCapture={blurRail}
        onFocusCapture={focusRail}
        onPointerEnter={previewRail}
        onPointerLeave={dismissRailPreview}
        ref={railRef}
      >
        <div className={`rail-brand ${styles.railBrand}`}>
          <span className="brand-mark small">M</span>
          <span className={styles.brandCopy}>
            <strong>Workbench</strong>
            <small>matriz local</small>
          </span>
          <button
            aria-controls={RAIL_ID}
            aria-expanded={railExpanded}
            aria-label={railPreference === "expanded" ? "Recolher menu" : "Expandir menu"}
            className={styles.railToggle}
            onClick={toggleRailPreference}
            title={railPreference === "expanded" ? "Recolher menu" : "Fixar menu aberto"}
            type="button"
          >
            <span aria-hidden="true">{railPreference === "expanded" ? "‹" : "›"}</span>
          </button>
        </div>
        <nav className={`primary-nav ${styles.primaryNav}`} aria-label="Navegação principal">
          {renderNavigation(primaryNavigation)}
        </nav>
        <div className={`rail-section-title ${styles.sectionTitle}`}>
          <span className={styles.navLabel}>Apps detectados</span>
          <span>{projectNavigation.length}</span>
        </div>
        <nav className={`project-nav ${styles.projectNav}`} aria-label="Projetos">
          {renderNavigation(projectNavigation)}
        </nav>
        <div className={`rail-footer ${styles.railFooter}`}>
          <nav aria-label="Preferências">{renderNavigation(secondaryNavigation)}</nav>
          <form action={lockAction}>
            <button aria-label="Bloquear Workbench" type="submit">
              <span aria-hidden="true" className={`rail-icon ${styles.navIcon}`}>↗</span>
              <span className={styles.navLabel}>Bloquear</span>
            </button>
          </form>
        </div>
      </aside>
      <div className={`workspace-frame ${styles.workspaceFrame}`}>
        <header
          className={`topbar ${styles.topbar}`}
          data-visible={topbarVisible}
          id={TOPBAR_ID}
          inert={topbarVisible ? undefined : true}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) hideTopbarLater()
          }}
          onFocusCapture={revealTopbar}
          onPointerEnter={revealTopbar}
          onPointerLeave={hideTopbarLater}
          ref={topbarRef}
        >
          <button
            aria-controls={RAIL_ID}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            className={styles.mobileMenuButton}
            onClick={() => setMobileOpen((current) => !current)}
            ref={mobileTriggerRef}
            type="button"
          >
            <span aria-hidden="true">☰</span>
          </button>
          {topbar}
          <button
            aria-label={topbarPreference === "pinned" ? "Usar barra superior automática" : "Fixar barra superior"}
            aria-pressed={topbarPreference === "pinned"}
            className={styles.topbarPin}
            onClick={toggleTopbarPreference}
            title={topbarPreference === "pinned" ? "Barra fixada" : "Fixar barra"}
            type="button"
          >
            <span aria-hidden="true">{topbarPreference === "pinned" ? "●" : "○"}</span>
          </button>
        </header>
        <div id="workspace-content" tabIndex={-1}>{children}</div>
      </div>
    </div>
  )
}
