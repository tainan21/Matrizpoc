import { describe, expect, it } from "vitest"
import { assertAgentDesktopCommand, parseDesktopCommand } from "../src/domain/desktop-bridge"
import { assessEmbedding, isAllowedSurfaceNavigation, resolveApprovedSurfaceUrl } from "../src/integration/desktop/project-surface-policy"

describe("Project Host desktop acceptance contracts",()=>{
  it("keeps picker opaque and rejects renderer execution material",()=>{expect(parseDesktopCommand({type:"project.pick-root"})).toEqual({type:"project.pick-root"});expect(()=>parseDesktopCommand({type:"project.start",projectId:"p",actionId:"a",recipeRevision:"r",command:"npm run dev"})).toThrow();expect(()=>assertAgentDesktopCommand(parseDesktopCommand({type:"project.start",projectId:"p",actionId:"a",recipeRevision:"r"}))).toThrow("human interface")})
  it("allows only the approved exact loopback origin",()=>{const approved=resolveApprovedSurfaceUrl(4100,"/health");expect(approved.url).toBe("http://127.0.0.1:4100/health");expect(isAllowedSurfaceNavigation("http://127.0.0.1:4100/app",approved.origin)).toBe(true);expect(isAllowedSurfaceNavigation("http://localhost:4100/app",approved.origin)).toBe(false);expect(assessEmbedding({"x-frame-options":"DENY"}).compatible).toBe(false)})
})
