import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ProjectLibrary } from "./project-library"
import type { ProjectViewModel } from "../../modules/projects/presentation/project-presenter"

const project: ProjectViewModel = { id:"p1",name:"External",stackLabel:"Node · pnpm",trustLabel:"Revisada",state:"ready",stateLabel:"Pronto",attention:"none",recipeRevision:"r1",prepareActions:[],runActions:[],surfaces:[],permissions:[],sessions:[],prepared:true,reconciliationReason:null }
describe("ProjectLibrary",()=>{
  it("renders loading and safe empty copy",()=>{ expect(renderToStaticMarkup(<ProjectLibrary projects={[]} selectedId={null} loading onSelect={()=>{}} onAdd={()=>{}}/>)).toContain("Carregando projetos"); const empty=renderToStaticMarkup(<ProjectLibrary projects={[]} selectedId={null} loading={false} onSelect={()=>{}} onAdd={()=>{}}/>); expect(empty).toContain("Nada será instalado ou executado") })
  it("renders path-free project view models",()=>{ const html=renderToStaticMarkup(<ProjectLibrary projects={[project]} selectedId="p1" loading={false} onSelect={()=>{}} onAdd={()=>{}}/>); expect(html).toContain("External"); expect(html).not.toContain("C:\\") })
})
