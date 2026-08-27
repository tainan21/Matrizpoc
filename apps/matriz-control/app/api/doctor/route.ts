import { getDoctorService } from "../../../src/application/doctor-service"
import { apiError } from "../../../src/application/http"
import { toDoctorViewModel } from "../../../src/ui/doctor/doctor-presenter"
export async function GET(request: Request) { try { return Response.json(toDoctorViewModel(await getDoctorService().snapshot(new URL(request.url).searchParams.get("refresh") === "1"))) } catch (error) { return apiError(error) } }
