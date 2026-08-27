# Validação, riscos e critérios de aceite

## Evidências já executadas

| Gate | Resultado registrado |
| --- | --- |
| Smoke tests | **50 arquivos / 366 testes aprovados** |
| Lint e typecheck por escopo | **43 de 43 verificações aprovadas** |
| Boundaries arquiteturais | verificação concluída na consolidação |
| Fontes Prisma | **8 schemas/fontes inspecionados no inventário consolidado** |
| Instaladores | 4 artefatos locais com SHA-256 reconferido |

## Estado dos instaladores

| Aplicação | Estado |
| --- | --- |
| Matriz Control Electron | gerado e verificado |
| Matriz Desktop Tauri Control | gerado e verificado |
| Matriz Admin Tauri | gerado e verificado |
| Matriz Ops Tauri | gerado e verificado |
| Seumei Desktop | **INDEFINIDO/BLOQUEADO**: faltam URLs HTTPS oficiais |

Os detalhes, tamanhos e hashes canônicos estão em [INSTALLERS.md](INSTALLERS.md) e [installer-manifest.json](installer-manifest.json).

## Riscos abertos

1. Os executáveis são locais e não assinados; Windows pode exibir alerta de reputação.
2. O Hub não chegou a uma tela estável na sessão de captura e precisa de diagnóstico antes da release pública.
3. O Seumei Desktop não pode ser empacotado com segurança sem `SEUMEI_DESKTOP_APP_URL` e `SEUMEI_DESKTOP_HUB_URL` oficiais, ambas HTTPS.
4. A validação local não substitui instalação limpa, banco real, autenticação, RLS, observabilidade e testes de integração distribuída.
5. Branches e stashes históricos ainda ocupam espaço, mas preservá-los reduz risco de perda até o aceite.

## Gate final antes de publicação

- Repetir smoke, lint e typecheck na revisão exata a ser tagueada.
- Testar os quatro instaladores em Windows limpo e confirmar desinstalação.
- Assinar binários e publicar checksums.
- Corrigir ou explicar o carregamento do Hub.
- Definir URLs do Seumei Desktop e gerar seu instalador.
- Criar tag anotada `v1.0.0` somente após aprovação humana.
