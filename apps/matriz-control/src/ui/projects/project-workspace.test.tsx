import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { AddProjectWizard, projectWizardStep } from "./add-project-wizard"
import type { ProjectViewModel } from "../../modules/projects/presentation/project-presenter"
const base: ProjectViewModel={id:"p",name:"Demo",stackLabel:"Node",trustLabel:"Não revisada",state:"unknown",stateLabel:"Estado desconhecido",attention:"none",recipeRevision:"r",prepareActions:[],runActions:[],surfaces:[],permissions:[],sessions:[],prepared:false,reconciliationReason:null}
describe("project wizard",()=>{
  it("covers the six-step lifecycle",()=>{expect(projectWizardStep(base)).toBe(2);expect(projectWizardStep({...base,state:"needs_review"})).toBe(3);expect(projectWizardStep({...base,state:"ready",prepareActions:[{id:"install",label:"Install",commandPreview:"pnpm install",cwdLabel:"project-root",environmentKeys:[],ports:[],readinessLabel:"Sem probe",lifecycle:"prepare"}]})).toBe(4);expect(projectWizardStep({...base,state:"ready",prepared:true})).toBe(5);expect(projectWizardStep({...base,state:"running"})).toBe(6)})
  it("explains inspection without side effects",()=>{const html=renderToStaticMarkup(<AddProjectWizard project={base} preview={null} busy={false} onInspect={()=>{}} onApprove={()=>{}} onPreview={()=>{}} onPrepare={()=>{}}/>);expect(html).toContain("somente leitura");expect(html).toContain("Nenhum arquivo será executado")})
})
