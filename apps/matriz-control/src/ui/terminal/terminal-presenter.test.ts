import { describe, expect, it } from "vitest"
import { terminalMetadata } from "./terminal-presenter"
describe("terminal metadata", () => { it("formats port, pid, elapsed time, memory and validation", () => { expect(terminalMetadata({ route: "mih/apps/demo", port: 3000, pid: 42, memoryBytes: 125_000_000, validationLabel: "lint ok", startedAt: "2026-08-25T00:00:00.000Z" } as never, Date.parse("2026-08-25T00:02:05.000Z"))).toEqual({ route: "mih/apps/demo", port: ":3000", pid: "pid 42", duration: "2m 5s", memory: "125 mb ram", validation: "lint ok" }) }) })
