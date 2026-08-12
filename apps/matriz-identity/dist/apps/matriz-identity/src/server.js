import { createServer } from "node:http";
import { loadIdentityEnvironment } from "./config.js";
import { createIdentityProvider } from "./provider.js";
const environment = loadIdentityEnvironment(process.env);
const provider = await createIdentityProvider(environment);
const server = createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store, private");
    if (request.url === "/healthz") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ status: "ok" }));
        return;
    }
    provider.callback()(request, response);
});
server.listen(environment.port, "0.0.0.0");
function shutdown() {
    server.close((error) => {
        process.exitCode = error ? 1 : 0;
    });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
//# sourceMappingURL=server.js.map