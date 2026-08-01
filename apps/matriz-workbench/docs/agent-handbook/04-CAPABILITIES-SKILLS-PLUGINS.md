# 4. Capacidades, skills e plugins

## Codex

Codex pode ler e alterar o working tree usando as permissões normais da task.
Isso é diferente da aplicação Workbench:

- a aplicação web não recebe uma API genérica de shell ou filesystem;
- o MCP oferece ferramentas nomeadas;
- o App Server começa read-only e apresenta aprovações;
- mudanças de código continuam sujeitas às regras do repositório.

## MCP do Workbench

Use MCP quando o objetivo é:

- listar projetos;
- obter inventário e contexto compacto;
- ler backlog ou documentos;
- criar/atualizar artefatos canônicos;
- claimar ou concluir uma solicitação;
- registrar atividade.

Não crie ferramenta genérica de filesystem, shell ou delete. Leitura é
automática; mutações pedem aprovação.

## Skills

Skill é um procedimento especializado, não uma persona decorativa.

Use uma skill quando:

- o usuário a nomear;
- a tarefa corresponder claramente à descrição;
- ela reduzir risco ou fornecer um workflow obrigatório.

Regras:

1. leia o `SKILL.md` inteiro antes de agir;
2. carregue apenas referências relevantes;
3. anuncie quando a skill influenciar uma ação;
4. use o menor conjunto de skills capaz de resolver a tarefa;
5. não copie instruções longas da skill para o projeto.

Exemplos:

- Playwright para prova real no navegador;
- segurança para auditoria ou implementação secure-by-default;
- Next.js para rotas, Server Components e runtime;
- Figma somente quando há contexto de design real.

## Plugins

Plugins ampliam o Codex; não são dependências obrigatórias do Workbench.

| Plugin | Quando usar |
| --- | --- |
| GitHub | issue, PR, review ou publicação aprovada |
| Vercel | deploy, preview ou diagnóstico da plataforma |
| Figma | fonte de design existente |
| Notion/Drive | importação ou exportação explícita |
| Slack/Teams | notificação solicitada e autorizada |

Não instale ou conecte um plugin “porque talvez seja útil”. Não transforme
GitHub, Vercel ou Notion na fonte canônica da V1.

## Personas e lentes

Para trabalho normal, um único agente pode raciocinar sequencialmente como:

1. Product Engineer;
2. Software Architect;
3. UX Engineer;
4. Security/Performance Engineer.

Entregue uma síntese única. Não simule quatro pessoas nem repita o mesmo
contexto quatro vezes.

## Economia de tokens

- liste antes de ler;
- use IDs, hashes e referências;
- carregue apenas docs ligados à tarefa;
- prefira resumos estruturados;
- continue na mesma task enquanto o objetivo não mudar;
- não crie subagentes para trabalhos dependentes ou pequenos.
