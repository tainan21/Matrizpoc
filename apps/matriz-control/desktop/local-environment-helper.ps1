param(
  [Parameter(Mandatory=$true)][ValidateSet('Resolve')][string]$Action,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$AppId,
  [Parameter(Mandatory=$true)][string]$ContractPath
)
$ErrorActionPreference = 'Stop'

function Unprotect-LocalSecret([string]$path) {
  $secure = Get-Content -LiteralPath $path -Raw | ConvertTo-SecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Protect-LocalSecret([string]$value, [string]$path) {
  $protected = ConvertTo-SecureString $value -AsPlainText -Force | ConvertFrom-SecureString
  $temporary = "$path.$([Guid]::NewGuid().ToString('N')).tmp"
  [IO.File]::WriteAllText($temporary, $protected, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $path -Force
}

function New-RandomSecret {
  $bytes = New-Object byte[] 32
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($bytes) } finally { $random.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function New-TotpSecret {
  $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  $bytes = New-Object byte[] 20
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($bytes) } finally { $random.Dispose() }
  $builder = [Text.StringBuilder]::new()
  $buffer = 0
  $bits = 0
  foreach ($byte in $bytes) {
    $buffer = ($buffer -shl 8) -bor $byte
    $bits += 8
    while ($bits -ge 5) {
      $bits -= 5
      [void]$builder.Append($alphabet[($buffer -shr $bits) -band 31])
      if ($bits -gt 0) { $buffer = $buffer -band ((1 -shl $bits) - 1) } else { $buffer = 0 }
    }
  }
  if ($bits -gt 0) { [void]$builder.Append($alphabet[($buffer -shl (5 - $bits)) -band 31]) }
  return $builder.ToString()
}

function ConvertTo-Base64Url([byte[]]$bytes) {
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function New-SigningJwks {
  $rsa = [Security.Cryptography.RSA]::Create(2048)
  try {
    $key = $rsa.ExportParameters($true)
    $kidHash = [Security.Cryptography.SHA256]::Create()
    try { $kid = (ConvertTo-Base64Url $kidHash.ComputeHash($key.Modulus)).Substring(0, 22) } finally { $kidHash.Dispose() }
    return @{ keys = @(@{ kty='RSA'; use='sig'; alg='RS256'; kid=$kid; n=ConvertTo-Base64Url $key.Modulus; e=ConvertTo-Base64Url $key.Exponent; d=ConvertTo-Base64Url $key.D; p=ConvertTo-Base64Url $key.P; q=ConvertTo-Base64Url $key.Q; dp=ConvertTo-Base64Url $key.DP; dq=ConvertTo-Base64Url $key.DQ; qi=ConvertTo-Base64Url $key.InverseQ }) } | ConvertTo-Json -Depth 5 -Compress
  }
  finally { $rsa.Dispose() }
}

function Read-SecretMap([string]$path) {
  $map = @{}
  if (-not (Test-Path -LiteralPath $path)) { return $map }
  $parsed = Unprotect-LocalSecret $path | ConvertFrom-Json
  foreach ($property in $parsed.PSObject.Properties) { $map[$property.Name] = [string]$property.Value }
  return $map
}

function Get-OrCreateSecret([hashtable]$store, [string]$key, [scriptblock]$factory) {
  if (-not $store.ContainsKey($key)) { $store[$key] = [string](& $factory) }
  return [string]$store[$key]
}

function Get-RequiredMapValue([hashtable]$store, [string]$key, [string]$label) {
  if (-not $store.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$store[$key])) { throw "$label is unavailable in the Control vault." }
  return [string]$store[$key]
}

$resolvedContractPath = [IO.Path]::GetFullPath($ContractPath)
if ([IO.Path]::GetFileName($resolvedContractPath) -ne 'infrastructure.json' -or -not (Test-Path -LiteralPath $resolvedContractPath -PathType Leaf)) { throw 'A valid infrastructure.json is required.' }
$contract = [IO.File]::ReadAllText($resolvedContractPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
if ($contract.schemaVersion -ne 'v1' -or $contract.appId -ne $AppId) { throw 'Infrastructure Contract identity mismatch.' }

$vaultRoot = Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault'
[IO.Directory]::CreateDirectory($vaultRoot) | Out-Null
$applicationSecretPath = Join-Path $vaultRoot 'application-secrets.dpapi'
$databaseSecrets = Read-SecretMap (Join-Path $vaultRoot 'database-roles.dpapi')
$cacheSecrets = Read-SecretMap (Join-Path $vaultRoot 'cache-roles.dpapi')
$natsSecrets = Read-SecretMap (Join-Path $vaultRoot 'nats-roles.dpapi')
$applicationSecrets = Read-SecretMap $applicationSecretPath
$result = [ordered]@{}
$result['MATRIZ_RUNTIME_PROFILE'] = 'local'

foreach ($declaration in $contract.environment.keys) {
  $name = [string]$declaration.name
  $value = $null
  if ($name -eq 'MATRIZ_RUNTIME_PROFILE') { $value = 'local' }
  elseif ($name -eq 'PORT') { $value = [string]$contract.runtime.port }
  elseif ($name -eq 'IDENTITY_ISSUER' -or $name -eq 'MATRIZ_IDENTITY_ISSUER') { $value = 'http://127.0.0.1:8080' }
  elseif ($name -eq 'IDENTITY_AUTHENTICATOR_MODULE') { $value = './credential-authenticator.js' }
  elseif ($name -eq 'CACHE_URL') { $value = 'redis://127.0.0.1:46379' }
  elseif ($name -eq 'NATS_URL') { $value = 'nats://127.0.0.1:54222' }
  elseif ($name -eq 'PAY_NATS_USERNAME') { $value = 'matriz_pay' }
  elseif ($name -eq 'PAY_OUTBOX_WORKER_ENABLED') { $value = 'true' }
  elseif ($name -eq 'SEUMEI_NATS_USERNAME') { $value = 'matriz_seumei' }
  elseif ($name -eq 'SEUMEI_OUTBOX_WORKER_ENABLED') { $value = 'true' }
  elseif ($name -eq 'HUB_NATS_USERNAME') { $value = 'matriz_hub' }
  elseif ($name -eq 'HUB_OUTBOX_WORKER_ENABLED') { $value = 'true' }
  elseif ($name -eq 'MATRIZ_PAY_INTERNAL_URL') { $value = 'http://127.0.0.1:3012' }
  elseif ($name -eq 'MATRIZ_OPS_SERVICE_TOKEN') { $value = Get-OrCreateSecret $applicationSecrets 'service::matriz-ops::matriz-pay' { New-RandomSecret } }
  elseif ($name -match '_CACHE_USERNAME$') { $value = 'matriz_' + $AppId.Replace('matriz-','').Replace('-','_') }
  elseif ($name -match '_CACHE_DEFAULT_TTL_SECONDS$') { $value = [string]$contract.cache.defaultTtlSeconds }
  elseif ($name -match '_OIDC_CLIENT_ID$') { $value = [string]$contract.identity.oidcClientId }
  elseif ($name -match '_OIDC_CALLBACK_URL$') { $value = "http://127.0.0.1:$($contract.runtime.port)$($contract.identity.callbackPath)" }
  elseif ($name -eq 'IDENTITY_SIGNING_JWKS') { $value = Get-OrCreateSecret $applicationSecrets 'identity::signing-jwks' { New-SigningJwks } }
  elseif ($name -eq 'IDENTITY_COOKIE_KEYS') { $value = Get-OrCreateSecret $applicationSecrets 'identity::cookie-keys' { "$(New-RandomSecret),$(New-RandomSecret)" } }
  elseif ($name -eq 'IDENTITY_MFA_ENCRYPTION_KEY') { $value = Get-OrCreateSecret $applicationSecrets 'identity::mfa-key' { New-RandomSecret } }
  elseif ($name -eq 'IDENTITY_LOCAL_OWNER_TOTP_SECRET') { $value = Get-OrCreateSecret $applicationSecrets 'identity::local-owner-totp' { New-TotpSecret } }
  elseif ($name -eq 'IDENTITY_LOCAL_OPERATOR_TOTP_SECRET') { $value = Get-OrCreateSecret $applicationSecrets 'identity::local-operator-totp' { New-TotpSecret } }
  elseif ($name -like 'OIDC_CLIENT_SECRET_*') {
    $clientId = $name.Substring('OIDC_CLIENT_SECRET_'.Length).ToLowerInvariant().Replace('_','-')
    $value = Get-OrCreateSecret $applicationSecrets "oidc::$clientId" { New-RandomSecret }
  }
  elseif ($name -match '_OIDC_CLIENT_SECRET$') { $value = Get-OrCreateSecret $applicationSecrets "oidc::$($contract.identity.oidcClientId)" { New-RandomSecret } }
  elseif ($name -match '_SESSION_SECRET$' -or $name -eq 'IDENTITY_CSRF_SECRET') { $value = Get-OrCreateSecret $applicationSecrets "$AppId::$name" { New-RandomSecret } }
  elseif ($name -match '(_RUNTIME|_WORKER)?_DATABASE_URL$') {
    if (-not $contract.database.required) { throw "$name cannot be generated for an app without a database." }
    $role = if ($name -match '_WORKER_DATABASE_URL$') { [string]$contract.database.workerRole } else { [string]$contract.database.runtimeRole }
    $password = Get-RequiredMapValue $databaseSecrets $role "Database credential $role"
    $encoded = [Uri]::EscapeDataString($password)
    $value = "postgresql://$role`:$encoded@127.0.0.1:55432/matriz?schema=$($contract.database.schema)"
  }
  elseif ($name -match '_CACHE_PASSWORD$') {
    $cacheRole = 'matriz_' + $AppId.Replace('matriz-','').Replace('-','_')
    $value = Get-RequiredMapValue $cacheSecrets $cacheRole "Cache credential $cacheRole"
  }
  elseif ($name -eq 'PAY_NATS_PASSWORD') { $value = Get-RequiredMapValue $natsSecrets 'matriz_pay' 'NATS credential matriz_pay' }
  elseif ($name -eq 'SEUMEI_NATS_PASSWORD') { $value = Get-RequiredMapValue $natsSecrets 'matriz_seumei' 'NATS credential matriz_seumei' }
  elseif ($name -eq 'HUB_NATS_PASSWORD') { $value = Get-RequiredMapValue $natsSecrets 'matriz_hub' 'NATS credential matriz_hub' }
  elseif ($declaration.source -eq 'control-vault') { $value = Get-OrCreateSecret $applicationSecrets "$AppId::$name" { New-RandomSecret } }
  elseif ($declaration.required) { throw "No local generator exists for required key $name." }
  if (-not [string]::IsNullOrWhiteSpace([string]$value)) { $result[$name] = [string]$value }
}

Protect-LocalSecret ($applicationSecrets | ConvertTo-Json -Compress) $applicationSecretPath
$account = "$env:USERDOMAIN\$env:USERNAME"
if ($account -notmatch '^[\w .-]+\\[\w .-]+$') { throw 'The current Windows account cannot secure the Control vault.' }
& icacls.exe $vaultRoot /inheritance:r /grant:r "${account}:(OI)(CI)(F)" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Control vault ACL setup failed.' }
$result | ConvertTo-Json -Compress
