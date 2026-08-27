import { resolve } from "node:path"
import { StartupService } from "../../../src/application/startup-service"
import { getTerminalSupervisor } from "../../../src/application/terminal-supervisor"
import { apiError,assertSameOrigin } from "../../../src/application/http"
import { listTerminalProjects } from "../../../src/integration/projects/project-catalog"
import { createConnection } from "node:net"
const portAvailable=(port:number)=>new Promise<boolean>(done=>{const socket=createConnection({host:"localhost",port});const finish=(available:boolean)=>{socket.destroy();done(available)};socket.setTimeout(700);socket.once("connect",()=>finish(false));socket.once("timeout",()=>finish(true));socket.once("error",()=>finish(true))})
const key=Symbol.for("matriz.control.startup");function service(){const scope=globalThis as typeof globalThis&{[key]?:StartupService};const root=resolve(process.cwd(),"../..");const supervisor=getTerminalSupervisor();return scope[key]??=new StartupService({projects:()=>listTerminalProjects(root),sessions:()=>supervisor.list(),start:(p,a)=>supervisor.start(p,a),stop:(id)=>supervisor.stop(id),now:Date.now,portAvailable})}
export async function POST(request:Request){try{assertSameOrigin(request);const body=await request.json() as Record<string,unknown>;if(typeof body.token==="string")return Response.json(await service().confirm(body.token));if(typeof body.profile!=="string")throw new Error("Invalid startup request");if(body.action==="stop")return Response.json(await service().stopProfile(body.profile));return Response.json(await service().preview(body.profile))}catch(error){return apiError(error)}}
