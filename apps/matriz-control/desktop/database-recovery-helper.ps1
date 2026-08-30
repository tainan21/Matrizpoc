param(
  [Parameter(Mandatory = $true)][ValidateSet("List", "Backup", "DailyBackup", "Restore", "Recreate")][string]$Action,
  [string]$BackupId
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$managedRoot = Join-Path $env:ProgramData 'Matriz\Infrastructure'
$backupRoot = Join-Path $managedRoot 'backups'
$vaultRoot = Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault'
$bootstrapSecretPath = Join-Path $vaultRoot 'bootstrap-postgres.dpapi'
$postgresBin = Join-Path $env:ProgramFiles 'PostgreSQL\17\bin'
$pgDump = Join-Path $postgresBin 'pg_dump.exe'
$pgRestore = Join-Path $postgresBin 'pg_restore.exe'
$psql = Join-Path $postgresBin 'psql.exe'
$createdb = Join-Path $postgresBin 'createdb.exe'
$dropdb = Join-Path $postgresBin 'dropdb.exe'
$expectedSchemas = @('core','hub','spot','seumei','contracts','willdash','ops','pay')
$backupIdPattern = '^backup_\d{8}_[a-z0-9]{6,32}$'

function Assert-ChildPath([string]$Root, [string]$Candidate) {
  $resolvedRoot = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
  $resolvedCandidate = [IO.Path]::GetFullPath($Candidate)
  if (-not $resolvedCandidate.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Recovery path escaped the managed backup root."
  }
}

function Assert-BackupId([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch $backupIdPattern) {
    throw "Invalid backup id."
  }
}

function Unprotect-LocalSecret([string]$SecretFile) {
  $secure = Get-Content -LiteralPath $SecretFile -Raw | ConvertTo-SecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Invoke-Psql([string]$Database, [string]$Sql, [switch]$TuplesOnly) {
  $arguments = @('--host','127.0.0.1','--port','55432','--username','matriz_provisioner','--dbname',$Database,'--no-password','--set','ON_ERROR_STOP=1')
  if ($TuplesOnly) { $arguments += @('--tuples-only','--no-align') }
  $result = $Sql | & $psql @arguments
  if ($LASTEXITCODE -ne 0) { throw "Managed PostgreSQL operation failed." }
  return $result
}

function Get-BackupPaths([string]$Id) {
  Assert-BackupId $Id
  $dump = Join-Path $backupRoot ($Id + '.dump')
  $manifest = Join-Path $backupRoot ($Id + '.json')
  Assert-ChildPath $backupRoot $dump
  Assert-ChildPath $backupRoot $manifest
  return @{ Dump=$dump; Manifest=$manifest }
}

function Read-BackupManifest([string]$Id) {
  $paths = Get-BackupPaths $Id
  if (-not (Test-Path -LiteralPath $paths.Dump) -or -not (Test-Path -LiteralPath $paths.Manifest)) { throw "Backup is not present in the managed catalog." }
  $manifest = Get-Content -LiteralPath $paths.Manifest -Raw | ConvertFrom-Json
  if ($manifest.schemaVersion -ne 'v1' -or $manifest.id -ne $Id -or $manifest.database -ne 'matriz') { throw "Backup manifest is invalid." }
  $actualHash = (Get-FileHash -LiteralPath $paths.Dump -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $manifest.sha256 -or (Get-Item -LiteralPath $paths.Dump).Length -ne $manifest.bytes) { throw "Backup checksum validation failed." }
  & $pgRestore --list $paths.Dump | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL rejected the backup catalog." }
  return @{ Paths=$paths; Manifest=$manifest }
}

function Get-BackupCatalog {
  if (-not (Test-Path -LiteralPath $backupRoot)) { return @() }
  $items = @()
  foreach ($manifestFile in Get-ChildItem -LiteralPath $backupRoot -Filter 'backup_*.json' -File) {
    try {
      $id = $manifestFile.BaseName
      $record = Read-BackupManifest $id
      $items += [ordered]@{ id=$id; kind=$record.Manifest.kind; createdAt=$record.Manifest.createdAt; pinned=[bool]$record.Manifest.pinned; valid=$true; bytes=[long]$record.Manifest.bytes; sha256=$record.Manifest.sha256 }
    }
    catch {
      $candidateId = $manifestFile.BaseName
      if ($candidateId -match $backupIdPattern) { $items += [ordered]@{ id=$candidateId; kind='daily'; createdAt=$manifestFile.LastWriteTimeUtc.ToString('o'); pinned=$true; valid=$false; bytes=0; sha256=('0' * 64) } }
    }
  }
  return @($items | Sort-Object createdAt -Descending)
}

function New-ManagedBackup([string]$Kind) {
  New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
  $suffix = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(6)).ToLowerInvariant()
  $id = 'backup_' + [DateTime]::UtcNow.ToString('yyyyMMdd') + '_' + $suffix
  $paths = Get-BackupPaths $id
  $temporary = $paths.Dump + '.tmp'
  Assert-ChildPath $backupRoot $temporary
  try {
    & $pgDump --host 127.0.0.1 --port 55432 --username matriz_provisioner --dbname matriz --no-password --format custom --file $temporary
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL backup failed." }
    $sha256 = (Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant()
    $serverVersion = (Invoke-Psql 'matriz' 'SHOW server_version;' -TuplesOnly | Out-String).Trim()
    $manifest = [ordered]@{
      schemaVersion='v1'; id=$id; database='matriz'; kind=$Kind; createdAt=[DateTime]::UtcNow.ToString('o'); pinned=$false
      postgresVersion=$serverVersion; schemas=$expectedSchemas; bytes=(Get-Item -LiteralPath $temporary).Length; sha256=$sha256
    }
    Move-Item -LiteralPath $temporary -Destination $paths.Dump
    [IO.File]::WriteAllText($paths.Manifest, ($manifest | ConvertTo-Json -Depth 4), [Text.UTF8Encoding]::new($false))
  }
  finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
  return $id
}

function Invoke-DailyRetention {
  $daily = @(Get-BackupCatalog | Where-Object { $_.kind -eq 'daily' -and -not $_.pinned -and $_.valid } | Sort-Object createdAt -Descending)
  foreach ($expired in @($daily | Select-Object -Skip 7)) {
    $paths = Get-BackupPaths $expired.id
    Remove-Item -LiteralPath $paths.Dump -Force
    Remove-Item -LiteralPath $paths.Manifest -Force
  }
}

function Restore-ManagedBackup([string]$Id) {
  $record = Read-BackupManifest $Id
  $suffix = ($Id -split '_')[-1]
  $temporaryDatabase = 'matriz_restore_' + $suffix
  $quarantineDatabase = 'matriz_quarantine_' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ').ToLowerInvariant()
  if ($temporaryDatabase -notmatch '^matriz_restore_[a-z0-9]{6,32}$' -or $quarantineDatabase -notmatch '^matriz_quarantine_[a-z0-9]+$') { throw "Generated recovery database name is invalid." }

  # restore_temporary
  & $dropdb --host 127.0.0.1 --port 55432 --username matriz_provisioner --if-exists --force --no-password $temporaryDatabase
  if ($LASTEXITCODE -ne 0) { throw "Could not reset the temporary restore database." }
  & $createdb --host 127.0.0.1 --port 55432 --username matriz_provisioner --owner matriz_provisioner --no-password $temporaryDatabase
  if ($LASTEXITCODE -ne 0) { throw "Could not create the temporary restore database." }
  & $pgRestore --host 127.0.0.1 --port 55432 --username matriz_provisioner --dbname $temporaryDatabase --no-password --exit-on-error $record.Paths.Dump
  if ($LASTEXITCODE -ne 0) { throw "Temporary restore failed." }

  # validate_temporary
  $schemaList = (Invoke-Psql $temporaryDatabase "SELECT string_agg(schema_name, ',' ORDER BY schema_name) FROM information_schema.schemata WHERE schema_name = ANY (ARRAY['core','hub','spot','seumei','contracts','willdash','ops','pay']);" -TuplesOnly | Out-String).Trim()
  $actualSchemas = @($schemaList -split ',' | Where-Object { $_ })
  if ($actualSchemas.Count -ne 8 -or @($expectedSchemas | Where-Object { $_ -notin $actualSchemas }).Count -ne 0) { throw "Temporary restore failed schema validation." }
  $invalidIndexes = (Invoke-Psql $temporaryDatabase 'SELECT count(*) FROM pg_index WHERE NOT indisvalid;' -TuplesOnly | Out-String).Trim()
  if ($invalidIndexes -ne '0') { throw "Temporary restore contains invalid indexes." }

  # promote_restored
  Invoke-Psql 'postgres' "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('matriz','$temporaryDatabase') AND pid <> pg_backend_pid();" | Out-Null
  Invoke-Psql 'postgres' "ALTER DATABASE matriz RENAME TO $quarantineDatabase; ALTER DATABASE $temporaryDatabase RENAME TO matriz;" | Out-Null
  $promotedSchemas = (Invoke-Psql 'matriz' "SELECT count(*) FROM information_schema.schemata WHERE schema_name = ANY (ARRAY['core','hub','spot','seumei','contracts','willdash','ops','pay']);" -TuplesOnly | Out-String).Trim()
  if ($promotedSchemas -ne '8') { throw "Promoted database failed its health gate; previous database remains quarantined." }
  return $quarantineDatabase
}

foreach ($binary in @($pgDump,$pgRestore,$psql,$createdb,$dropdb)) { if (-not (Test-Path -LiteralPath $binary)) { throw "PostgreSQL 17 recovery binary is unavailable." } }
if (-not (Test-Path -LiteralPath $bootstrapSecretPath)) { throw "Managed PostgreSQL bootstrap authority is unavailable." }
$password = Unprotect-LocalSecret $bootstrapSecretPath
$previousPassword = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $password
  if ($Action -eq 'List') { ConvertTo-Json @(Get-BackupCatalog) -Depth 4 -Compress; exit 0 }
  if ($Action -eq 'Backup') { New-ManagedBackup 'guard' | Out-Null; ConvertTo-Json @(Get-BackupCatalog) -Depth 4 -Compress; exit 0 }
  if ($Action -eq 'DailyBackup') { New-ManagedBackup 'daily' | Out-Null; Invoke-DailyRetention; ConvertTo-Json @(Get-BackupCatalog) -Depth 4 -Compress; exit 0 }
  Assert-BackupId $BackupId
  if ($Action -eq 'Recreate') { New-ManagedBackup 'guard' | Out-Null }
  Restore-ManagedBackup $BackupId | Out-Null
  ConvertTo-Json @(Get-BackupCatalog) -Depth 4 -Compress
}
finally { $env:PGPASSWORD = $previousPassword }
