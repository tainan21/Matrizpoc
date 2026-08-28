import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  Stack,
  Text,
} from "@matriz/design-ui"
import { createDistributionGatewayFromEnvironment } from "../../src/integration/gateways/distribution.gateway"
import {
  changeProductStateAction,
  createProductAction,
  createReleaseAction,
  publishReleaseAction,
  retireReleaseAction,
} from "./actions"

export const dynamic = "force-dynamic"

export default async function DistributionPage() {
  const configured = Boolean(process.env.MATRIZ_DISTRIBUTION_ADMIN_TOKEN)
  const catalog = await createDistributionGatewayFromEnvironment()
    .catalog()
    .catch(() => ({
      schemaVersion: "v1" as const,
      generatedAt: new Date().toISOString(),
      products: [],
    }))
  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Distribuição</Heading>
        <Text tone="muted">
          Catálogo confiável de instaladores Windows. Binários não são enviados pelo navegador.
        </Text>
      </div>
      {!configured && (
        <div className="distribution-warning">
          Configure <code>MATRIZ_DISTRIBUTION_ADMIN_TOKEN</code> no servidor Admin e Hub para
          publicar alterações.
        </div>
      )}
      <div className="distribution-grid">
        {catalog.products.map((product) => (
          <Card key={product.productId}>
            <CardHeader>
              <CardTitle>
                {product.displayName} · {product.edition}
              </CardTitle>
              <CardDescription>{product.productId}</CardDescription>
            </CardHeader>
            <div className="distribution-meta">
              <Badge tone={product.state === "active" ? "success" : "neutral"}>
                {product.state}
              </Badge>
              <span>
                {product.runtime} · {product.platform}/{product.arch}
              </span>
            </div>
            <Text size="sm">
              Windows: {product.windows.displayName} · {product.windows.publisher}
            </Text>
            <Text size="sm">
              Release:{" "}
              {product.release
                ? `${product.release.version} (${product.release.status})`
                : "nenhuma publicada"}
            </Text>
            <form action={changeProductStateAction} className="distribution-inline">
              <input type="hidden" name="productId" value={product.productId} />
              <select name="state" defaultValue={product.state}>
                <option value="active">Ativo</option>
                <option value="unavailable">Indisponível</option>
                <option value="retired">Retirado</option>
              </select>
              <button type="submit">Salvar estado</button>
            </form>
            {product.release && (
              <div className="distribution-inline">
                <form action={publishReleaseAction}>
                  <input type="hidden" name="releaseId" value={product.release.releaseId} />
                  <button type="submit">Publicar</button>
                </form>
                <form action={retireReleaseAction}>
                  <input type="hidden" name="releaseId" value={product.release.releaseId} />
                  <button type="submit">Retirar</button>
                </form>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Novo produto</CardTitle>
          <CardDescription>
            Identidade aprovada do Windows; nenhum comando livre é aceito.
          </CardDescription>
        </CardHeader>
        <form action={createProductAction} className="distribution-form">
          {[
            "productId",
            "displayName",
            "edition",
            "uninstallKey",
            "windowsName",
            "publisher",
            "executableName",
            "aliases",
          ].map((name) => (
            <label key={name}>
              {name}
              <input name={name} required={name !== "aliases"} />
            </label>
          ))}
          <label>
            runtime
            <select name="runtime">
              <option value="tauri">Tauri</option>
              <option value="electron">Electron</option>
              <option value="native">Native</option>
              <option value="web">Web</option>
            </select>
          </label>
          <button type="submit">Criar produto</button>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Nova release</CardTitle>
          <CardDescription>Informe somente manifesto já assinado pelo pipeline.</CardDescription>
        </CardHeader>
        <form action={createReleaseAction} className="distribution-form">
          {[
            "productId",
            "version",
            "fileName",
            "downloadUrl",
            "sizeBytes",
            "sha256",
            "signature",
            "releaseNotes",
          ].map((name) => (
            <label key={name}>
              {name}
              <input name={name} required={name !== "releaseNotes"} />
            </label>
          ))}
          <label>
            channel
            <select name="channel">
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
            </select>
          </label>
          <button type="submit">Criar rascunho</button>
        </form>
      </Card>
    </Stack>
  )
}
