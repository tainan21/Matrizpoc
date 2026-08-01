import Link from "next/link"
import { Button, Card, CardHeader, CardTitle, Stack, Text } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable } from "../../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ docId: string }>
}

export default async function EditDocPage({ params }: Props) {
  try {
    const { docId } = await params
    const detail = await makeDocsRepository().getDocument(defaultDocsActorContext, docId)
    if (!detail) return <DocsUnavailable error={new Error("Documento nao encontrado")} />
    const content = detail.blocks.map((b) => (b.type === "heading" ? `# ${b.plainText}` : b.plainText)).join("\n\n")
    return (
      <Stack gap={6}>
        <DocsHeader title={`Editar: ${detail.title}`} description="Editor V1 simples por Markdown estruturado. Salvar cria nova versao draft." />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Draft estruturado</CardTitle></CardHeader>
          <form action={`/api/docs/documents/${detail.id}`} method="post">
            <Stack gap={3}>
              <label className="text-sm font-medium">Titulo<input name="title" className="mt-1 w-full rounded-md border border-border p-3" defaultValue={detail.title} /></label>
              <label className="text-sm font-medium">Motivo da mudanca<input name="changeReason" className="mt-1 w-full rounded-md border border-border p-3" defaultValue="Atualizacao MatrizDocs" /></label>
              <label className="text-sm font-medium">Conteudo<textarea name="content" className="mt-1 w-full rounded-md border border-border p-3" rows={16} defaultValue={content} /></label>
              <div className="flex gap-2">
                <Button type="submit">Salvar nova draft</Button>
                <Link href={`/docs/${detail.id}`} className="no-underline"><Button type="button" variant="secondary">Voltar</Button></Link>
              </div>
            </Stack>
          </form>
        </Card>
        <Text tone="muted" size="sm">Marcacoes suportadas: headings Markdown, listas, hashtags, termos de decisao, regra, risco, governanca e task candidate.</Text>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
