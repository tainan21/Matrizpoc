param(
  [Parameter(Mandatory=$true)][ValidateSet('ProvisionPay')][string]$Action
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

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
  $bytes = New-Object byte[] 48
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($bytes) } finally { $random.Dispose() }
  return [Convert]::ToBase64String($bytes)
}

$vaultRoot = Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault'
[IO.Directory]::CreateDirectory($vaultRoot) | Out-Null
$secretPath = Join-Path $vaultRoot 'nats-roles.dpapi'
$changed = $false
if (Test-Path -LiteralPath $secretPath) {
  $parsed = Unprotect-LocalSecret $secretPath | ConvertFrom-Json
  $secrets = @{}
  foreach ($property in $parsed.PSObject.Properties) { $secrets[$property.Name] = [string]$property.Value }
}
else { $secrets = @{} }
if (-not $secrets.ContainsKey('matriz_pay')) { $secrets['matriz_pay'] = New-RandomSecret; $changed = $true }
if (-not $secrets.ContainsKey('matriz_control')) { $secrets['matriz_control'] = New-RandomSecret; $changed = $true }
if ($changed) { Protect-LocalSecret ($secrets | ConvertTo-Json -Compress) $secretPath }
$payPassword = [string]$secrets.matriz_pay
$controlPassword = [string]$secrets.matriz_control
if ($payPassword.Length -lt 32 -or $controlPassword.Length -lt 32) { throw 'The NATS credentials are invalid.' }
$account = "$env:USERDOMAIN\$env:USERNAME"
if ($account -notmatch '^[\w .-]+\\[\w .-]+$') { throw 'The current Windows account cannot secure the Control vault.' }
& icacls.exe $vaultRoot /inheritance:r /grant:r "${account}:(OI)(CI)(F)" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Control vault ACL setup failed.' }
[Console]::Out.Write((@{ payPassword=$payPassword; controlPassword=$controlPassword } | ConvertTo-Json -Compress))
