# Matriz Uninstall — benchmark Tauri × Electron

O relatório final é produzido por `apps/matriz-uninstall/scripts/benchmark-windows.ps1` após os dois pacotes serem instalados no mesmo Windows descartável.

## Método obrigatório

- Windows 10/11 x64, mesmo usuário e máquina;
- cinco execuções por edição e cenário;
- registrar tamanho do instalador e da instalação;
- mediana e dispersão de abertura, RAM, CPU e ciclos operacionais;
- executar instalação, atualização, reinstalação, remoção e inspeção de resíduos somente numa VM descartável;
- comparar paridade funcional e visual sem eleger automaticamente uma edição vencedora.

O script versionado mede abertura, RAM e CPU sem alterar produtos. Os ciclos destrutivos permanecem deliberadamente fora da máquina de desenvolvimento.

## Resultado local — 2026-08-28

Ambiente: Windows 10.0.26200 x64, Intel Family 6 Model 186, 12 processadores lógicos. Cinco execuções por edição usando os binários de release `0.1.0`; faixa representa mínimo–máximo.

| Métrica | Tauri (preferencial) | Electron (compatibilidade) |
| --- | ---: | ---: |
| Instalador NSIS | 2,84 MiB | 106,92 MiB |
| Abertura, mediana | 302 ms (277–1171) | 701 ms (498–1208) |
| Working set, mediana | 24,6 MiB (24,5–24,7) | 92,2 MiB (91,8–95,0) |

Nesta amostra, Tauri reduziu o instalador em aproximadamente 97% e o working set mediano em aproximadamente 73%. O ensaio não incluiu instalação ou desinstalação: esses ciclos são destrutivos e continuam reservados à VM descartável de aceitação. Os dados brutos estão ao lado dos instaladores entregues, em `benchmark-results.json`.
