import { describe, expect, it } from "vitest"

import type { PortProcess } from "../domain/types"
import { filterPorts, presentPorts } from "./presenters"

const ports: readonly PortProcess[] = [
  { port: 5432, pid: 80, processName: "postgres.exe", state: "external" },
  { port: 3007, pid: 70, processName: "node.exe", state: "ready" },
  { port: 3000, pid: 60, processName: "node.exe", state: "ready" },
]

describe("desktop presenters", () => {
  it("sorts Matriz listeners by catalog order before external listeners", () => {
    expect(presentPorts(ports).map(({ port }) => port)).toEqual([3000, 3007, 5432])
  })

  it("filters by port, PID or process without changing the source", () => {
    expect(filterPorts(ports, "postgres").map(({ pid }) => pid)).toEqual([80])
    expect(filterPorts(ports, "3007").map(({ pid }) => pid)).toEqual([70])
    expect(filterPorts(ports, "60").map(({ port }) => port)).toEqual([3000])
    expect(ports).toHaveLength(3)
  })
})
