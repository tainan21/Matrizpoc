# Matriz Control — relatório de aceitação Windows

Gerado em: 2026-09-04T13:22:41.849Z

## Resultado executivo

**Verdict: Not Ready**

- Contrato instalado: 188/196 resultados verdes.
- Ciclos consecutivos completos: 0/2.
- Mesmo artefato nos dois ciclos: sim.
- Overflow horizontal: zero.
- Controles sem nome acessível: zero.
- Foco por teclado: visível.

## Targets

### Installed baseline

O baseline representa o aplicativo que já estava instalado antes da recuperação. Ele é evidência histórica e não certifica o candidato atual.

- Versão: 1.1.0
- SHA-256: 4628E68E737C231C310266A647F61EB66A913B946AB1D159AB5AE6E12F1A78BB
- Executável: %USERPROFILE%\AppData\Local\Matriz Control\matriz-control.exe

### Packaged candidate

O candidato é o NSIS produzido pelo commit atual, instalado, exercitado dentro do WebView2 real, encerrado pela API do produto e desinstalado em cada ciclo.

| Ciclo | Casos | SHA-256 do instalador | Startup ≤ | RAM média | CPU idle | Desinstalado |
|---|---:|---|---:|---:|---:|---|
| acceptance-20260904-cycle1b | 94/98 | 3a6cad4dfd0cf962fd8c4fb38b6fcc5c7a04055186fac9f568f6bce310b66c10 | 665 ms | 40.78 MB | 0.2403% | sim |
| acceptance-20260904-cycle2 | 94/98 | 3a6cad4dfd0cf962fd8c4fb38b6fcc5c7a04055186fac9f568f6bce310b66c10 | 554 ms | 40.71 MB | 0.2150% | sim |

## Produto validado

1. Portas e processos — inventário, PID, refresh, kill e kill-all autorizados por snapshot.
2. Terminal — PowerShell/ConPTY real, seis abas, Unicode, Ctrl+C e encerramento limpo.
3. Apps — catálogo de nove produtos; nove ciclos completos de runtime e proteção de listeners externos.
4. Ações — gates tipados de types, lint, smoke e Prisma com saída observável.
5. Doctor — workspace, Node, pnpm e Git verificados localmente.
6. Git pulse — branch e estado do worktree sem transformar o app em cliente Git genérico.
7. Quick jumps — Explorer, Terminal e destinos Matriz allowlisted.
8. Preferências — sons, volume, tray, startup e workspace persistidos.
9. Matriz Admin nativo — gerar, verificar SHA-256, instalar, abrir e fechar pelo Control.

## Evidência visual e acessibilidade

- Viewports: 420×560, 760×700 e 1440×900.
- Áreas: Portas, Apps, Terminal, Ações, Doctor e Ajustes.
- Capturas por ciclo: 42.
- Política de movimento: transições limitadas a 100 ms e removidas quando o sistema solicita redução.
- Terminal largo: dock lateral; terminal compacto: área dedicada sempre acessível.

## Segurança e limites

- A UI automatizada envia somente IDs tipados; não envia executáveis, argumentos ou comandos de shell.
- Kill exige PID observado e snapshot atual; processos protegidos e ownership divergente são rejeitados.
- Instaladores só executam dentro do workspace após SHA-256 válido.
- O harness instalado aceita somente o diretório oficial ou a raiz isolada de aceitação.
- O terminal é a única superfície arbitrária e fica isolado em sessões ConPTY limitadas.
- O instalador 1.1 permanece sem assinatura; distribuição pública deve aguardar signing e canal confiável.

## Achados residuais

| Severidade | Achado | Estado |
|---|---|---|
| minor | Instalador 1.1 ainda não assinado | aceito para distribuição interna |

## Conclusão

O Matriz Control ainda não satisfaz o contrato de release; consulte os ciclos incompletos acima.
