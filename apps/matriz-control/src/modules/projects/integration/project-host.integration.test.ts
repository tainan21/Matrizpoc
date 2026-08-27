import { access, readFile, rm, writeFile } from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"
import { BoundedProjectReader } from "./bounded-project-reader"
import { detectNodeProject } from "./node-project-detector"
import { createExternalNodeFixture } from "../test/external-node-fixtures"
import { redactProjectOutput } from "../domain/redaction"

const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0)) await rm(root,{recursive:true,force:true})})
describe("external Project Host boundary",()=>{
  it.each(["npm","pnpm","bun"] as const)("inspects an external %s project without installation or execution",async(manager)=>{const root=await createExternalNodeFixture({manager});roots.push(root);const before=await readFile(`${root}/package.json`,"utf8");const evidence=await new BoundedProjectReader({resolveRoot:async()=>root}).readEvidence("opaque-root");const candidate=detectNodeProject(evidence);expect(candidate.status).toBe("candidate");expect(candidate.detectors).toContainEqual({detector:"node",kind:"package-manager",value:manager});expect(await readFile(`${root}/package.json`,"utf8")).toBe(before);await expect(access(`${root}/node_modules`)).rejects.toBeTruthy()})
  it("detects manifest drift and redacts synthetic secrets",async()=>{const root=await createExternalNodeFixture({manager:"npm"});roots.push(root);const reader=new BoundedProjectReader({resolveRoot:async()=>root});const first=detectNodeProject(await reader.readEvidence("opaque"));await writeFile(`${root}/package.json`,JSON.stringify({name:"changed",scripts:{dev:"next dev -p 4555"}}));const second=detectNodeProject(await reader.readEvidence("opaque"));expect(second).not.toEqual(first);expect(redactProjectOutput("TOKEN=synthetic-secret\nAuthorization: Bearer abc")).not.toContain("synthetic-secret");expect(redactProjectOutput("TOKEN=synthetic-secret")).toContain("[redacted]")})
})
