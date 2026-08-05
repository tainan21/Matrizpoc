import Link from "next/link"
import { Button, Card, CardDescription, CardHeader, CardTitle, Heading, Stack, Text } from "@matriz/design-ui"
import { DocsHeader, DocsNav } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default function NewDocPage() {
  return (
    <Stack gap={6}>
      <DocsHeader
        title="Criar documento"
        description="Crie um documento canonico. A V1 transforma o texto em blocos, entidades, sugestoes e timeline."
      />
      <DocsNav />
      <Card>
        <CardHeader>
          <CardTitle>Modo rapido</CardTitle>
          <CardDescription>Titulo, tipo, visibilidade e conteudo inicial.</CardDescription>
        </CardHeader>
        <form action="/api/docs/documents" method="post">
          <DocsFormFields />
          <div className="mt-4 flex gap-2">
            <Button type="submit">Salvar draft</Button>
            <Link href="/docs" className="no-underline"><Button type="button" variant="secondary">Cancelar</Button></Link>
          </div>
        </form>
      </Card>
    </Stack>
  )
}

function DocsFormFields() {
  return (
    <Stack gap={3}>
      <label className="text-sm font-medium">Titulo<input name="title" className="mt-1 w-full rounded-md border border-border p-3" required /></label>
      <label className="text-sm font-medium">Tipo
        <select name="type" className="mt-1 w-full rounded-md border border-border p-3" defaultValue="institutional">
          <option value="institutional">institutional</option>
          <option value="technical">technical</option>
          <option value="governance">governance</option>
          <option value="financial">financial</option>
          <option value="onboarding">onboarding</option>
          <option value="requirement">requirement</option>
          <option value="mcp_context">mcp_context</option>
        </select>
      </label>
      <label className="text-sm font-medium">Visibilidade
        <select name="visibility" className="mt-1 w-full rounded-md border border-border p-3" defaultValue="internal">
          <option value="internal">internal</option>
          <option value="restricted">restricted</option>
          <option value="public">public</option>
          <option value="private">private</option>
        </select>
      </label>
      <label className="text-sm font-medium">Projeto / modulo<input name="projectId" className="mt-1 w-full rounded-md border border-border p-3" placeholder="matriz:hub" /></label>
      <label className="text-sm font-medium">Descricao<input name="description" className="mt-1 w-full rounded-md border border-border p-3" /></label>
      <label className="text-sm font-medium">Conteudo<textarea name="content" className="mt-1 w-full rounded-md border border-border p-3" rows={12} required placeholder="# MatrizDocs&#10;MatrizDocs é a memoria viva da Matriz." /></label>
      <Text tone="muted" size="sm">Dica: use #MatrizWallet, #Governança, !risco, "precisamos" ou "foi decidido" para ver blocos e sugestoes nascerem.</Text>
    </Stack>
  )
}
