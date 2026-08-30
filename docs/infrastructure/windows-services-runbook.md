# Runbook — serviços Windows da infraestrutura Matriz

## Fronteira de ownership

O Control possui somente `MatrizPostgres17`, `MatrizGarnet` e `MatrizNats`.
Qualquer serviço homônimo cujo `ImagePath` não contenha
`%ProgramData%\Matriz\Infrastructure` é `external_unowned`: status somente,
nunca start, stop, restart, adoção ou remoção. O PostgreSQL externo em `5432`
não pertence ao catálogo.

## Pré-requisitos

- Windows x64 e Control Desktop;
- PostgreSQL major 17 em `%ProgramFiles%\PostgreSQL\17`;
- .NET Runtime 8 para o host `Garnet.worker`;
- acesso de rede aos releases oficiais do Garnet e NATS;
- uma confirmação UAC durante o primeiro setup.

## Instalação

1. Registre `Get-Service` e os listeners de `5432`, `55432`, `56379`, `54222`
   e `58222` antes da operação.
2. Abra **Infrastructure → Overview → Instalar stack Matriz**.
3. Revise o preview e confirme dentro de 30 segundos.
4. Aceite o UAC. O helper baixa para um staging exclusivo, confere tamanho e
   SHA-256 e publica os runtimes somente depois da validação.
5. Confirme os três estados `healthy` e o receipt
   `%ProgramData%\Matriz\Infrastructure\installation-receipt.json`.
6. Compare novamente o serviço/listener externo de `5432`.

O bootstrap PostgreSQL cria uma senha aleatória, usa SCRAM e grava somente a
forma protegida por DPAPI em
`%LOCALAPPDATA%\Matriz\Control\vault\bootstrap-postgres.dpapi`. O texto
temporário fica no staging e é removido no `finally`.

## Operação cotidiana

Start, stop e restart são pedidos por IDs fechados e usam o SCM. O SID que fez
a instalação recebe apenas os direitos de consulta e lifecycle necessários.
Fechar o Control não para os serviços. Todos usam Automatic (Delayed Start).

Logs exibidos no renderer têm no máximo 200 linhas e 2.000 caracteres por
linha; credenciais de URL e campos `password`, `secret`, `token` e
`authorization` são redigidos.

## Upgrade

Não substitua binários manualmente. Upgrade exige primeiro alterar e revisar o
catálogo com nova origem, versão, tamanho e SHA-256; depois, criar uma ação de
upgrade com staging, backup de guarda, health e rollback. A V1 rejeita upgrade
implícito.

## Desinstalação

A remoção da stack não é uma consequência de desinstalar o Control. Dados e
serviços persistem para evitar perda acidental. A remoção destrutiva será
oferecida somente pelo fluxo `recreate/uninstall` com backup válido e token de
confirmação do Plano 3. Até esse gate, não remova pastas nem serviços
manualmente como procedimento normal.

## Diagnóstico

- `external_unowned`: não renomeie nem adote; resolva o conflito fora do
  Control ou escolha outro nome em uma revisão arquitetural.
- `drifted`: start mode ou fingerprint divergiu; não force lifecycle.
- `degraded`: SCM indica Running, mas pelo menos um listener fixo não respondeu.
- `failed`: consulte Logs; não cole URLs completas ou secrets em incidentes.
- setup interrompido: o staging é removido; runtimes já publicados permanecem
  para uma nova execução idempotente, sem tocar em serviços externos.
