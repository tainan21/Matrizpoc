# Criar e integrar um novo projeto

## Decisão inicial

Antes de criar uma pasta, registre:

- problema e público;
- bounded context proprietário;
- plataforma necessária;
- dados e integrações;
- capacidades existentes que podem ser reutilizadas;
- motivo para app novo em vez de módulo de um app existente.

## App dentro do monorepo

Crie `apps/<app>` com:

```text
AGENTS.md
README.md
package.json
public-contract.ts
docs/AGENT-START-HERE.md
src/manifest/manifest.ts
src/bootstrap/index.ts
```

Etapas:

1. fazer o app rodar isoladamente;
2. declarar manifest e ownership;
3. adaptar env, auth e design;
4. manter domínio local;
5. adicionar public contract;
6. atualizar registry e smoke tests quando necessário;
7. abrir Workbench e inicializar o `.matriz`;
8. criar backlog e score específicos.

Uma nova pasta com `package.json` aparece automaticamente no Workbench. O
botão de inicialização cria somente `.matriz/**`.

## Projeto em outro repositório

Não use imports por caminho entre repositórios. Escolha uma fronteira:

- pacote versionado;
- API versionada;
- evento;
- MCP;
- artefato Git;
- link externo.

O Infra Hub não deve copiar o domínio do produto externo. Mantenha um adapter
e um contrato pequeno, com proprietário e estratégia de versão.

## Critério para compartilhar

Não mova código para package durante a primeira migração. Estabilize o produto
e extraia apenas quando dois consumidores provarem a mesma necessidade.

## Checklist

- [ ] app inicia isoladamente;
- [ ] `AGENTS.md` orienta a camada correta;
- [ ] README declara ownership;
- [ ] manifest e bootstrap existem;
- [ ] nenhum import de internals de outro app;
- [ ] UI usa ViewModels;
- [ ] envs estão documentadas e não commitadas;
- [ ] lint, typecheck e build passam;
- [ ] smoke tests relevantes passam;
- [ ] Workbench detecta o projeto;
- [ ] `.matriz` contém roadmap e backlog iniciais.
