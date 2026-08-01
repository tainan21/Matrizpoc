import { Button, Card, CardDescription, CardHeader, CardTitle, Stack, Text } from "@matriz/design-ui"
import { DocsHeader, DocsNav } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default function ImportDocPage() {
  return (
    <Stack gap={6}>
      <DocsHeader
        title="Importar documento"
        description="Cole texto, Markdown ou conversa bruta. A MatrizDocs preserva o original, cria documento raw, converte blocos e registra timeline."
      />
      <DocsNav />
      <Card>
        <CardHeader>
          <CardTitle>Triagem de entrada</CardTitle>
          <CardDescription>V1 suporta texto/Markdown/TXT e deixa PDF preparado como source artifact.</CardDescription>
        </CardHeader>
        <form action="/api/docs/imports" method="post">
          <Stack gap={3}>
            <label className="text-sm font-medium">Titulo<input name="title" className="mt-1 w-full rounded-md border border-border p-3" required /></label>
            <label className="text-sm font-medium">Origem
              <select name="sourceKind" className="mt-1 w-full rounded-md border border-border p-3" defaultValue="pasted_text">
                <option value="pasted_text">Texto colado</option>
                <option value="markdown">Markdown</option>
                <option value="whatsapp">Conversa WhatsApp</option>
                <option value="pdf_prepared">PDF preparado</option>
              </select>
            </label>
            <label className="text-sm font-medium">Tipo
              <select name="type" className="mt-1 w-full rounded-md border border-border p-3" defaultValue="institutional">
                <option value="institutional">institutional</option>
                <option value="proposal">proposal</option>
                <option value="meeting_note">meeting_note</option>
                <option value="prompt">prompt</option>
                <option value="research">research</option>
              </select>
            </label>
            <label className="text-sm font-medium">Conteudo bruto<textarea name="content" className="mt-1 w-full rounded-md border border-border p-3" rows={14} required /></label>
            <Button type="submit">Salvar original e converter</Button>
          </Stack>
        </form>
      </Card>
      <Card>
        <CardTitle>Etapas registradas</CardTitle>
        <Text tone="muted">Original salvo, texto extraido, blocos criados, entidades sugeridas, relacoes/sugestoes preparadas e timeline atualizada.</Text>
      </Card>
    </Stack>
  )
}
