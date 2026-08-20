import Link from "next/link"

export function SystemState({ kind }: { readonly kind: "unavailable" | "forbidden" }) {
  return <main className="status-page"><span className="eyebrow">{kind === "unavailable" ? "ESTADO DO SERVIÇO" : "ACESSO À EMPRESA"}</span><h1>{kind === "unavailable" ? "Seumei temporariamente indisponível" : "Empresa indisponível"}</h1><p>{kind === "unavailable" ? "Não foi possível acessar os dados agora. Nenhuma informação temporária foi exibida." : "Sua sessão não possui acesso a esta empresa."}</p>{kind === "forbidden" ? <Link href="/">Voltar às empresas</Link> : null}</main>
}
