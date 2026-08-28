import { describe, expect, it } from "vitest"
import { parseWindowsCommandLine } from "./windows-command-line"

describe("parseWindowsCommandLine", () => {
  it("separa executável citado e argumentos NSIS", () => {
    expect(
      parseWindowsCommandLine('"C:\\Program Files\\Matriz\\uninstall.exe" /S /currentuser'),
    ).toEqual({
      executable: "C:\\Program Files\\Matriz\\uninstall.exe",
      args: ["/S", "/currentuser"],
    })
  })

  it("rejeita operadores de shell", () => {
    expect(() => parseWindowsCommandLine('"C:\\safe.exe" & calc.exe')).toThrow(/operador/)
  })

  it("preserva argumentos citados", () => {
    expect(
      parseWindowsCommandLine('msiexec.exe /x "{01234567-89AB-CDEF-0123-456789ABCDEF}" /qn').args,
    ).toEqual(["/x", "{01234567-89AB-CDEF-0123-456789ABCDEF}", "/qn"])
  })
})
