export function GET() {
  return new Response()
}

export const POST = async () => new Response()
export const notAHandler = "not a request handler"
export { putHandler as PUT } from "./route-target"
