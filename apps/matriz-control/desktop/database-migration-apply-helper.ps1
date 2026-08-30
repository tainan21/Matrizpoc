param(
  [Parameter(Mandatory = $true)][ValidateSet('core','hub','spot','seumei','contracts','willdash','ops','pay')][string]$Schema,
  [Parameter(Mandatory = $true)][string]$MigrationsRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Unprotect-LocalSecret([string]$Path) {
  $secure = Get-Content -LiteralPath $Path -Raw | ConvertTo-SecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Invoke-LedgerSql([string]$Sql, [switch]$TuplesOnly) {
  $arguments = @('--host','127.0.0.1','--port','55432','--username',$role,'--dbname','matriz','--no-password','--set','ON_ERROR_STOP=1')
  if ($TuplesOnly) { $arguments += @('--tuples-only','--no-align') }
  $result = $Sql | & $psql @arguments
  if ($LASTEXITCODE -ne 0) { throw 'Managed migration ledger operation failed.' }
  return ($result | Out-String).Trim()
}

$root = [IO.Path]::GetFullPath($MigrationsRoot)
$schemaRoot = [IO.Path]::GetFullPath((Join-Path (Join-Path $root $Schema) 'migrations'))
if (-not $schemaRoot.StartsWith($root.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $schemaRoot -PathType Container)) { throw 'Managed migrations root is invalid.' }
$psql = Join-Path $env:ProgramFiles 'PostgreSQL\17\bin\psql.exe'
$secretFile = Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault\database-roles.dpapi'
if (-not (Test-Path -LiteralPath $psql) -or -not (Test-Path -LiteralPath $secretFile)) { throw 'Managed migration authority is unavailable.' }

$role = "matriz_${Schema}_migration"
$secrets = Unprotect-LocalSecret $secretFile | ConvertFrom-Json
$passwordProperty = $secrets.PSObject.Properties[$role]
if ($null -eq $passwordProperty -or [string]::IsNullOrWhiteSpace([string]$passwordProperty.Value)) { throw 'Schema migration credential is unavailable.' }
$previousPassword = $env:PGPASSWORD
$temporary = $null
try {
  $env:PGPASSWORD = [string]$passwordProperty.Value
  $ledgerSql = @"
CREATE TABLE IF NOT EXISTS "$Schema"."_prisma_migrations" (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);
"@
  Invoke-LedgerSql $ledgerSql | Out-Null

  foreach ($directory in @(Get-ChildItem -LiteralPath $schemaRoot -Directory | Sort-Object Name)) {
    if ($directory.Name -notmatch '^\d{12}_[a-z0-9_]+$') { throw 'Migration directory name is invalid.' }
    $migrationFile = Join-Path $directory.FullName 'migration.sql'
    if (-not (Test-Path -LiteralPath $migrationFile -PathType Leaf)) { throw 'Migration SQL is missing.' }
    $name = $directory.Name
    $checksum = (Get-FileHash -LiteralPath $migrationFile -Algorithm SHA256).Hash.ToLowerInvariant()
    $escapedName = $name.Replace("'", "''")
    $existing = Invoke-LedgerSql ('SELECT checksum || ''|'' || CASE WHEN finished_at IS NOT NULL THEN ''finished'' WHEN rolled_back_at IS NOT NULL THEN ''rolledback'' ELSE ''failed'' END FROM "{0}"."_prisma_migrations" WHERE migration_name=''{1}'' ORDER BY started_at DESC LIMIT 1;' -f $Schema,$escapedName) -TuplesOnly
    if (-not [string]::IsNullOrWhiteSpace($existing)) {
      $parts = $existing -split '\|', 2
      if ($parts[0] -ne $checksum) { throw 'Applied migration checksum differs from the packaged migration.' }
      if ($parts[1] -eq 'finished') { continue }
      if ($parts[1] -eq 'failed') { throw 'A failed migration requires explicit resolution.' }
    }

    $id = [Guid]::NewGuid().ToString()
    $sql = "SET search_path TO `"$Schema`";`n" + [IO.File]::ReadAllText($migrationFile, [Text.Encoding]::UTF8)
    $preprovisionedSchema = 'CREATE SCHEMA IF NOT EXISTS "' + $Schema + '";'
    $sql = $sql.Replace($preprovisionedSchema, '-- Schema is preprovisioned and owned by the migration role.')
    $sql += "`nINSERT INTO `"$Schema`".`"_prisma_migrations`" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('$id', '$checksum', now(), '$escapedName', 1);`n"
    $temporary = Join-Path $env:TEMP ("matriz-migration-$Schema-$($directory.Name)-$([Guid]::NewGuid().ToString('N')).sql")
    [IO.File]::WriteAllText($temporary, $sql, [Text.UTF8Encoding]::new($false))
    & $psql --host 127.0.0.1 --port 55432 --username $role --dbname matriz --no-password --set ON_ERROR_STOP=1 --single-transaction --file $temporary | Out-Null
    if ($LASTEXITCODE -ne 0) {
      $failedId = [Guid]::NewGuid().ToString()
      Invoke-LedgerSql ('INSERT INTO "{0}"."_prisma_migrations" (id, checksum, migration_name, logs) VALUES (''{1}'',''{2}'',''{3}'',''Managed migration failed; inspect sanitized service logs.'');' -f $Schema,$failedId,$checksum,$escapedName) | Out-Null
      throw 'Managed migration failed.'
    }
    Remove-Item -LiteralPath $temporary -Force
    $temporary = $null
  }
  @{ schema=$Schema; state='applied' } | ConvertTo-Json -Compress
}
finally {
  if ($temporary -and (Test-Path -LiteralPath $temporary)) { Remove-Item -LiteralPath $temporary -Force }
  $env:PGPASSWORD = $previousPassword
}
