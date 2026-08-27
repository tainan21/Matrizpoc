# Instaladores locais da Matriz V1

Foram produzidos quatro instaladores Windows NSIS locais. Todos estão fora do Git e não possuem assinatura de produção.

Local de entrega:

`output/releases/v1/installers/`

## Resultado

| Aplicação | Arquivo | Tamanho | SHA-256 | Estado |
| --- | --- | ---: | --- | --- |
| Matriz Control Electron | `Matriz-Control-Electron-0.1.0-local-unsigned.exe` | 208.790.596 bytes | `29e181ab66842a720e46ae1cf0bcd7e4927bfa0a8d855674dba2db6a7627bc6a` | Gerado |
| Matriz Desktop Tauri Control | `Matriz-Desktop-Tauri-Control-0.1.0-local-unsigned.exe` | 2.558.138 bytes | `8bb6c42fc7bba27e6de92ad3c9cca8c73115e6bb1fc5762933052c9a04b3ee37` | Gerado |
| Matriz Admin Desktop | `Matriz-Admin-Tauri-0.1.0-local-unsigned.exe` | 1.984.831 bytes | `b08271a8ecdce3fc7f09ac767ac3aec388d40ca18227b85fd44466cf774288f6` | Gerado |
| Matriz Ops Desktop | `Matriz-Ops-Tauri-0.1.0-local-unsigned.exe` | 1.834.979 bytes | `f2e4704076f703cfb70322c6b5742c91c60efffbcd6ab464e6a1b89e289e18d2` | Gerado |
| Seumei Desktop | — | — | — | **INDEFINIDO / bloqueado com segurança** |

## Por que o Seumei não foi gerado

O empacotamento exige `SEUMEI_DESKTOP_APP_URL` e `SEUMEI_DESKTOP_HUB_URL`, ambas HTTPS. O fluxo oficial recebe esses valores de variáveis protegidas do release. Como os valores oficiais não estavam disponíveis localmente, o build foi interrompido pelo próprio controle de segurança. Nenhuma URL fictícia foi embutida.

## Verificação antes de instalar

No PowerShell, execute:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath "caminho-do-instalador.exe"
```

Compare o campo `Hash` com esta tabela ou com `installer-manifest.json`. Não execute o arquivo se o hash divergir.

## Instalação

1. Verifique o SHA-256.
2. Feche versões anteriores do aplicativo.
3. Execute o instalador correspondente ao produto desejado.
4. Como os arquivos são artefatos locais não assinados, o Windows pode apresentar um alerta de reputação. Confirme a origem local e o hash antes de continuar.
5. Não distribua estes arquivos como release pública. Uma publicação oficial requer assinatura, URLs oficiais e o pipeline de release apropriado.

## Logs

Os logs completos permanecem fora do Git em `output/releases/v1/logs/`. Eles incluem a instalação de dependências e cada tentativa de empacotamento.

