import * as os from "node:os"
import type { LightweightSample, SystemSampler } from "../application/collect-system-snapshot"
import type { CpuTicks } from "../domain/system-health"

interface NodeCpuInfo {
  readonly times: {
    readonly user: number
    readonly nice: number
    readonly sys: number
    readonly idle: number
    readonly irq: number
  }
}

export interface NodeOs {
  cpus(): readonly NodeCpuInfo[]
  platform(): string
  uptime(): number
  totalmem(): number
  freemem(): number
}

export class NodeSystemSampler implements SystemSampler {
  private previousTicks: CpuTicks | undefined

  constructor(private readonly system: NodeOs = os) {}

  sample(): LightweightSample {
    const currentTicks = sumCpuTicks(this.system.cpus())
    const previousTicks = this.previousTicks ?? currentTicks
    this.previousTicks = currentTicks

    return {
      platform: this.system.platform(),
      uptimeSeconds: this.system.uptime(),
      cpuTicks: {
        idle: currentTicks.idle - previousTicks.idle,
        total: currentTicks.total - previousTicks.total,
      },
      totalMemoryBytes: this.system.totalmem(),
      freeMemoryBytes: this.system.freemem(),
    }
  }
}

function sumCpuTicks(cpus: readonly NodeCpuInfo[]): CpuTicks {
  return cpus.reduce<CpuTicks>((totals, cpu) => {
    const total = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq
    return { idle: totals.idle + cpu.times.idle, total: totals.total + total }
  }, { idle: 0, total: 0 })
}
