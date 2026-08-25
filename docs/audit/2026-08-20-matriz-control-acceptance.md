# Matriz Control — relatório de aceitação Windows

Gerado em: 2026-08-22T15:07:56.679Z

## Resultado executivo

**Verdict: Ready**

- Contrato instalado: 196/196 resultados verdes.
- Ciclos consecutivos completos: 2/2.
- Mesmo artefato nos dois ciclos: sim.
- Overflow horizontal: zero.
- Controles sem nome acessível: zero.
- Foco por teclado: visível.

## Targets

### Installed baseline

O baseline representa o aplicativo que já estava instalado antes da recuperação. Ele é evidência histórica e não certifica o candidato atual.

- Versão: 0.1.0
- SHA-256: 712F6F99217FD4832119516A01079E8D8FADACC08799152589239732C80B6442
- Executável: %USERPROFILE%\AppData\Local\Matriz Control\matriz-control.exe

### Packaged candidate

O candidato é o NSIS produzido pelo commit atual, instalado, exercitado dentro do WebView2 real, encerrado pela API do produto e desinstalado em cada ciclo.

| Ciclo | Casos | SHA-256 do instalador | Startup ≤ | RAM média | CPU idle | Desinstalado |
|---|---:|---|---:|---:|---:|---|
| final-1 | 98/98 | fb1fe2acf0b7c9eabc4a4f3eacba300752d03a9d4b8ca53c23f5d2b958ccd4e4 | 471 ms | 30.47 MB | 0.0126% | sim |
| final-2 | 98/98 | fb1fe2acf0b7c9eabc4a4f3eacba300752d03a9d4b8ca53c23f5d2b958ccd4e4 | 601 ms | 30.53 MB | 0.0211% | sim |

## Produto validado

1. Portas e processos — inventário, PID, refresh, kill e kill-all autorizados por snapshot.
2. Terminal — PowerShell/ConPTY real, seis abas, Unicode, Ctrl+C e encerramento limpo.
3. Apps — catálogo de nove produtos; oito ciclos completos e proteção do Contracts como processo externo na porta 3003 neste ambiente.
4. Ações — gates tipados de types, lint, smoke e Prisma com saída observável.
5. Doctor — workspace, Node, pnpm e Git verificados localmente.
6. Git pulse — branch e estado do worktree sem transformar o app em cliente Git genérico.
7. Quick jumps — Explorer, Terminal e destinos Matriz allowlisted.
8. Preferências — sons, volume, tray, startup e workspace persistidos.
9. Matriz Admin nativo — gerar, verificar SHA-256, instalar, abrir e fechar pelo Control.

## Evidência visual e acessibilidade

- Viewports: 420×560, 760×700 e 1440×900.
- Áreas: Portas, Apps, Terminal, Ações, Doctor e Ajustes.
- Capturas por ciclo: 18.
- Política de movimento: transições limitadas a 100 ms e removidas quando o sistema solicita redução.
- Terminal largo: dock lateral; terminal compacto: área dedicada sempre acessível.

## Segurança e limites

- A UI automatizada envia somente IDs tipados; não envia executáveis, argumentos ou comandos de shell.
- Kill exige PID observado e snapshot atual; processos protegidos e ownership divergente são rejeitados.
- Instaladores só executam dentro do workspace após SHA-256 válido.
- O harness instalado aceita somente o diretório oficial ou a raiz isolada de aceitação.
- O terminal é a única superfície arbitrária e fica isolado em sessões ConPTY limitadas.
- O instalador 0.1 permanece sem assinatura; distribuição pública deve aguardar signing e canal confiável.

## Achados residuais

| Severidade | Achado | Estado |
|---|---|---|
| minor | Instalador 0.1 ainda não assinado | aceito para distribuição interna |

## Conclusão

O Matriz Control está pronto para uso local e distribuição interna controlada no Windows.
