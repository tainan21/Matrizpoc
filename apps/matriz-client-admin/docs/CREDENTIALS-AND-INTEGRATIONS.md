# Credenciais, APIs e integrações

Este documento lista onde obter cada identificador ou segredo usado pelo Matriz Client Admin e pelo domínio `client-admin` do Hub.

## Regra de segurança

- Nunca envie tokens, JSON de service account, certificados, senhas ou `.env` ao Git.
- Produção e Preview devem ter valores separados.
- Dê somente o menor escopo necessário e defina responsável e data de rotação.
- Armazene segredos no vault da Matriz ou como variável `Sensitive` da Vercel.
- Ao suspeitar de vazamento, revogue primeiro, gere outro valor e só então atualize os ambientes.

O arquivo `.env.example` contém somente os nomes esperados. A Vercel documenta como [criar variáveis por ambiente](https://vercel.com/docs/environment-variables) e como [gerenciar e auditar Production, Preview e Development](https://vercel.com/docs/environment-variables/manage-across-environments).

## Vercel — monitoramento de projetos

Documentação oficial: [Vercel REST API](https://vercel.com/docs/rest-api) e [criação de Access Token](https://vercel.com/kb/guide/how-do-i-use-a-vercel-api-access-token).

1. Entre na conta pessoal que possui acesso ao time da Laudate.
2. Abra **Account Settings → Tokens** e crie um token com nome como `matriz-client-admin-production`.
3. Restrinja o token ao time necessário e registre uma data de rotação.
4. Copie o token uma única vez para `CLIENT_ADMIN_VERCEL_TOKEN` no ambiente seguro do Hub.
5. No dashboard da Vercel, abra o time. O Team ID aparece em **Team Settings → General**; salve como `CLIENT_ADMIN_VERCEL_TEAM_ID`.
6. Para cada projeto, abra **Project Settings → General** e copie o Project ID. Separe vários IDs por vírgula em `CLIENT_ADMIN_VERCEL_PROJECT_IDS`.

Variáveis do Hub:

| Variável | Segredo | Origem |
| --- | --- | --- |
| `CLIENT_ADMIN_VERCEL_TOKEN` | Sim | Account Settings → Tokens |
| `CLIENT_ADMIN_VERCEL_TEAM_ID` | Não | Team Settings → General |
| `CLIENT_ADMIN_VERCEL_PROJECT_IDS` | Não | Project Settings → General |

O token nunca é persistido nas tabelas. O Hub guarda apenas estado da fonte, horários e snapshots sanitizados.

## Google Analytics 4

Documentação oficial: [quickstart da Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart), [bibliotecas oficiais](https://developers.google.com/analytics/devguides/reporting/data/v1/client-libraries) e [seleção de conta/propriedade GA4](https://support.google.com/analytics/answer/12813202).

### Identificar a propriedade

1. Entre em [Google Analytics](https://analytics.google.com/).
2. Selecione a conta e a propriedade da Laudate.
3. Abra **Administrador → Configurações da propriedade → Detalhes da propriedade**.
4. Copie somente o número do Property ID para `CLIENT_ADMIN_GA4_PROPERTY_ID`.

### Acesso recomendado para produção

1. Crie ou selecione um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com).
3. Crie uma service account dedicada, sem papéis amplos no Google Cloud.
4. No GA4, em **Administrador → Gerenciamento de acesso à propriedade**, adicione o e-mail da service account com papel **Viewer**.
5. Guarde a credencial no vault. Não baixe nem versione JSON quando Workload Identity/ADC estiver disponível.

### Estado da V1

O adapter V1 aceita `CLIENT_ADMIN_GA4_ACCESS_TOKEN`, um access token OAuth de curta duração, para validar a integração. Ele não deve ser tratado como credencial permanente. O caminho de produção é trocar esse port para Application Default Credentials/service account, como orientado no quickstart oficial, sem mudar os contratos da UI.

| Variável | Segredo | Origem |
| --- | --- | --- |
| `CLIENT_ADMIN_GA4_PROPERTY_ID` | Não | Detalhes da propriedade GA4 |
| `CLIENT_ADMIN_GA4_ACCESS_TOKEN` | Sim | OAuth/ADC temporário usado pela V1 |

## OIDC e sessão do Client Admin

O provedor é o `matriz-identity`; não há chave de terceiros. O client `matriz-client-admin` é registrado pelo seed local e deve ser registrado separadamente no ambiente publicado.

| Variável | Onde configurar | Orientação |
| --- | --- | --- |
| `MATRIZ_IDENTITY_ISSUER` | Client Admin e Hub | URL HTTPS pública do Identity; localmente `http://127.0.0.1:8080` |
| `CLIENT_ADMIN_OIDC_CLIENT_ID` | Client Admin | Valor fixo `matriz-client-admin` |
| `CLIENT_ADMIN_OIDC_CALLBACK_URL` | Client Admin e cadastro OIDC | URL exata terminando em `/api/auth/oidc/callback` |
| `CLIENT_ADMIN_OIDC_CLIENT_SECRET` | Vault + Client Admin | Gere ao menos 32 bytes aleatórios; mantenha igual ao fingerprint/cadastro do Identity |
| `CLIENT_ADMIN_SESSION_SECRET` | Vault + Client Admin | Gere ao menos 32 bytes aleatórios, independente do segredo OIDC |
| `OIDC_CLIENT_SECRET_MATRIZ_CLIENT_ADMIN` | Vault + Identity | Mesmo valor de `CLIENT_ADMIN_OIDC_CLIENT_SECRET` |

Exemplo seguro para gerar valores localmente sem registrá-los no histórico do shell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Gere uma vez para OIDC e outra vez para a sessão. Não reutilize o mesmo segredo.

## Hub, banco e cache

O Client Admin não possui banco. O Hub usa:

| Variável | Responsabilidade |
| --- | --- |
| `MATRIZ_HUB_URL` | URL server-side do Hub consumida pelo Client Admin |
| `HUB_DATABASE_URL` | PostgreSQL do schema Hub; contém as projeções tenant-scoped |
| `CACHE_URL` | Endpoint Garnet, localmente `redis://127.0.0.1:46379` |
| `HUB_CACHE_USERNAME` | Usuário Garnet do Hub |
| `HUB_CACHE_PASSWORD` | Senha do Garnet, mantida no vault |

As migrations usam uma credencial de migration separada da credencial runtime. O runtime deve continuar sem `BYPASSRLS` e sem acesso aos schemas de outros apps.

## Publicação web e Windows

Para deploy da web, vincule `apps/matriz-client-admin` a um projeto Vercel e configure as variáveis de Preview antes de Production. Alterar uma variável exige novo deployment.

Para a release Windows, o workflow `.github/workflows/matriz-client-admin-windows-release.yml` exige:

| Secret/variable | Origem |
| --- | --- |
| `CLIENT_ADMIN_WEB_ORIGIN` | URL HTTPS de produção do Client Admin |
| `MATRIZ_WINDOWS_SIGNING_CERTIFICATE` | Certificado Authenticode PFX em base64, adquirido de uma autoridade certificadora confiável |
| `MATRIZ_WINDOWS_SIGNING_CERTIFICATE_PASSWORD` | Senha do PFX no secret store do GitHub |
| `MATRIZ_DISTRIBUTION_MANIFEST_PRIVATE_KEY` | Chave Ed25519 privada do catálogo de distribuição |
| `MATRIZ_DISTRIBUTION_HUB_URL` | URL do Hub que recebe a release assinada |
| `MATRIZ_DISTRIBUTION_ADMIN_TOKEN` | Token de serviço com capability de publicação de distribuição |

Configure secrets no [GitHub Actions secrets](https://docs.github.com/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions). Certificados, chave Ed25519, instaladores e manifestos assinados nunca entram no repositório.

## Checklist de ativação

1. Configurar e validar OIDC em Preview.
2. Configurar `MATRIZ_HUB_URL` e confirmar `/api/health` como disponível ou degradado de forma explicável.
3. Adicionar Vercel; executar refresh e confirmar `lastSuccessAt`.
4. Adicionar GA4 em modo temporário ou implementar ADC antes de produção permanente.
5. Verificar que nenhum segredo aparece em logs, snapshots ou respostas HTTP.
6. Promover as mesmas chaves nominais para Production com valores próprios.
7. Registrar owner, data de criação e próxima rotação no vault operacional.
