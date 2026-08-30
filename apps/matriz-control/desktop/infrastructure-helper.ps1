param(
  [Parameter(Mandatory = $true)][ValidateSet("Install")][string]$Action,
  [Parameter(Mandatory = $true)][string]$ProgramDataRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "The Matriz infrastructure setup requires elevation."
  }
}

function Assert-ChildPath([string]$Root, [string]$Candidate) {
  $resolvedRoot = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
  $resolvedCandidate = [IO.Path]::GetFullPath($Candidate)
  if (-not $resolvedCandidate.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Infrastructure path escaped the managed root."
  }
}

function Get-ServiceRecord([string]$Name) {
  return Get-CimInstance Win32_Service -Filter "Name='$Name'" -ErrorAction SilentlyContinue
}

function Assert-ServiceAvailable([string]$Name, [string]$ManagedRoot) {
  $service = Get-ServiceRecord $Name
  if ($null -ne $service -and -not $service.PathName.Contains($ManagedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Service $Name already exists outside the Matriz managed root."
  }
}

function Install-VerifiedArchive([hashtable]$Artifact, [string]$StagingRoot) {
  $archive = Join-Path $StagingRoot ($Artifact.Id + '.zip')
  Invoke-WebRequest -Uri $Artifact.Url -OutFile $archive -UseBasicParsing
  if ((Get-Item -LiteralPath $archive).Length -ne $Artifact.Bytes) { throw "Unexpected artifact size for $($Artifact.Id)." }
  $actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $Artifact.Sha256) { throw "SHA-256 verification failed for $($Artifact.Id)." }
  $destination = Join-Path $StagingRoot $Artifact.Id
  Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
  return $destination
}

function Invoke-Sc([string[]]$Arguments) {
  & sc.exe @Arguments | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Windows Service Control operation failed." }
}

function Grant-ServiceControl([string]$Name, [string]$Sid) {
  $output = (& sc.exe sdshow $Name 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0) { throw "Could not read service ACL for $Name." }
  $sddl = (($output -split "`r?`n") | Where-Object { $_ -match '^D:' } | Select-Object -First 1)
  if ([string]::IsNullOrWhiteSpace($sddl)) { throw "Service ACL for $Name is invalid." }
  $ace = "(A;;CCLCSWRPWPDTLOCRRC;;;$Sid)"
  if ($sddl.Contains(";;;$Sid)")) { return }
  $systemAclAt = $sddl.IndexOf('S:')
  $updated = if ($systemAclAt -ge 0) { $sddl.Insert($systemAclAt, $ace) } else { $sddl + $ace }
  Invoke-Sc @('sdset', $Name, $updated)
}

function Unprotect-LocalSecret([string]$Path) {
  $secure = Get-Content -LiteralPath $Path -Raw | ConvertTo-SecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Protect-LocalSecret([string]$Value, [string]$Path) {
  $encrypted = ConvertTo-SecureString $Value -AsPlainText -Force | ConvertFrom-SecureString
  [IO.File]::WriteAllText($Path, $encrypted, [Text.UTF8Encoding]::new($false))
}

function New-DatabaseSecret {
  $bytes = New-Object byte[] 48
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes); return [Convert]::ToBase64String($bytes) }
  finally { $generator.Dispose() }
}

function Invoke-Psql([string]$Psql, [string]$Database, [string]$Password, [string]$Sql) {
  $previous = $env:PGPASSWORD
  try {
    $env:PGPASSWORD = $Password
    $Sql | & $Psql --host 127.0.0.1 --port 55432 --username matriz_provisioner --dbname $Database --no-password --set ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL topology operation failed." }
  }
  finally { $env:PGPASSWORD = $previous }
}

Assert-Administrator
$expectedProgramData = [IO.Path]::GetFullPath($env:ProgramData).TrimEnd('\')
$requestedProgramData = [IO.Path]::GetFullPath($ProgramDataRoot).TrimEnd('\')
if (-not $requestedProgramData.Equals($expectedProgramData, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Only the Windows ProgramData root is accepted."
}

$managedRoot = Join-Path $requestedProgramData 'Matriz\Infrastructure'
$stagingRoot = Join-Path $managedRoot ('.staging-' + [Guid]::NewGuid().ToString('N'))
Assert-ChildPath $requestedProgramData $managedRoot
Assert-ChildPath $managedRoot $stagingRoot

$artifacts = @(
  @{ Id='garnet'; Url='https://github.com/microsoft/garnet/releases/download/v2.1.5/win-x64-based-readytorun.zip'; Bytes=49762902; Sha256='7d1d40254ef11dbb12bf59c07b6543a04f2b51049f515cfc9745f556f96c7466' },
  @{ Id='nats'; Url='https://github.com/nats-io/nats-server/releases/download/v2.14.5/nats-server-v2.14.5-windows-amd64.zip'; Bytes=7072774; Sha256='f66f840a211ab665083b88e9b7edbcf6296cda143be47e53e6f6bb8520692bbb' }
)

try {
  New-Item -ItemType Directory -Force -Path $managedRoot, $stagingRoot | Out-Null
  foreach ($name in @('MatrizPostgres17', 'MatrizGarnet', 'MatrizNats')) { Assert-ServiceAvailable $name $managedRoot }

  $postgresRoot = Join-Path $env:ProgramFiles 'PostgreSQL\17'
  $postgresExe = Join-Path $postgresRoot 'bin\postgres.exe'
  $pgCtl = Join-Path $postgresRoot 'bin\pg_ctl.exe'
  $initDb = Join-Path $postgresRoot 'bin\initdb.exe'
  $psql = Join-Path $postgresRoot 'bin\psql.exe'
  if (-not (Test-Path -LiteralPath $postgresExe) -or -not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path -LiteralPath $initDb) -or -not (Test-Path -LiteralPath $psql)) {
    throw "PostgreSQL major 17 was not found under Program Files."
  }
  $version = (& $postgresExe --version 2>&1 | Out-String)
  if ($version -notmatch 'PostgreSQL\) 17\.') { throw "Only PostgreSQL major 17 is accepted." }

  $garnetExpanded = Install-VerifiedArchive $artifacts[0] $stagingRoot
  $natsExpanded = Install-VerifiedArchive $artifacts[1] $stagingRoot
  $garnetSource = Join-Path $garnetExpanded 'net8.0'
  $natsSourceRoot = Get-ChildItem -LiteralPath $natsExpanded -Directory | Select-Object -First 1
  if ($null -eq $natsSourceRoot) { throw "NATS archive layout is invalid." }
  $natsSource = Join-Path $natsSourceRoot.FullName 'nats-server.exe'
  if (-not (Test-Path -LiteralPath (Join-Path $garnetSource 'Service\Garnet.worker.exe')) -or -not (Test-Path -LiteralPath $natsSource)) {
    throw "Verified archive does not contain the expected Windows service host."
  }

  $garnetTarget = Join-Path $managedRoot 'garnet\2.1.5'
  $natsTarget = Join-Path $managedRoot 'nats\2.14.5'
  New-Item -ItemType Directory -Force -Path (Split-Path $garnetTarget), (Split-Path $natsTarget) | Out-Null
  if (-not (Test-Path -LiteralPath $garnetTarget)) { Move-Item -LiteralPath $garnetSource -Destination $garnetTarget }
  if (-not (Test-Path -LiteralPath $natsTarget)) { New-Item -ItemType Directory -Path $natsTarget | Out-Null; Copy-Item -LiteralPath $natsSource -Destination (Join-Path $natsTarget 'nats-server.exe') }

  $postgresData = Join-Path $managedRoot 'postgres\data'
  $postgresLogs = Join-Path $managedRoot 'postgres\logs'
  $garnetData = Join-Path $managedRoot 'garnet\data'
  $garnetLogs = Join-Path $managedRoot 'garnet\logs'
  $natsData = Join-Path $managedRoot 'nats\data'
  $natsLogs = Join-Path $managedRoot 'nats\logs'
  $backupRoot = Join-Path $managedRoot 'backups'
  $controlRoot = Join-Path $managedRoot 'control'
  New-Item -ItemType Directory -Force -Path $postgresLogs, $garnetData, $garnetLogs, $natsData, $natsLogs, $backupRoot, $controlRoot | Out-Null

  $vaultRoot = Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault'
  $bootstrapSecretPath = Join-Path $vaultRoot 'bootstrap-postgres.dpapi'
  New-Item -ItemType Directory -Force -Path $vaultRoot | Out-Null
  if (-not (Test-Path -LiteralPath (Join-Path $postgresData 'PG_VERSION'))) {
    $bootstrapPassword = New-DatabaseSecret
    $passwordFile = Join-Path $stagingRoot 'postgres-password.txt'
    [IO.File]::WriteAllText($passwordFile, $bootstrapPassword, [Text.UTF8Encoding]::new($false))
    & $initDb -D $postgresData -U matriz_provisioner --auth-host=scram-sha-256 --auth-local=scram-sha-256 "--pwfile=$passwordFile" --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL cluster initialization failed." }
    Add-Content -LiteralPath (Join-Path $postgresData 'postgresql.conf') -Value "`nlisten_addresses = '127.0.0.1'`nport = 55432`npassword_encryption = 'scram-sha-256'`nmax_connections = 80`n"
    [IO.File]::WriteAllText((Join-Path $postgresData 'pg_hba.conf'), "local all all scram-sha-256`r`nhost all all 127.0.0.1/32 scram-sha-256`r`nhost all all ::1/128 reject`r`n", [Text.UTF8Encoding]::new($false))

    Protect-LocalSecret $bootstrapPassword $bootstrapSecretPath
    & icacls.exe $vaultRoot /inheritance:r /grant:r "$env:USERDOMAIN\$env:USERNAME:(OI)(CI)(F)" | Out-Null
  }
  elseif (Test-Path -LiteralPath $bootstrapSecretPath) { $bootstrapPassword = Unprotect-LocalSecret $bootstrapSecretPath }
  else { throw "The managed PostgreSQL cluster exists but its local bootstrap authority is unavailable." }

  if ($null -eq (Get-ServiceRecord 'MatrizPostgres17')) {
    & $pgCtl register -N MatrizPostgres17 -D $postgresData -S auto -o '-p 55432'
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL service registration failed." }
  }

  $garnetExe = Join-Path $garnetTarget 'Service\Garnet.worker.exe'
  $garnetLog = Join-Path $garnetLogs 'service.log'
  $garnetBinPath = ('"{0}" --bind 127.0.0.1 --port 56379 --memory 256m --index 16m --aof --recover --logdir "{1}" --checkpointdir "{1}" --file-logger "{2}"' -f $garnetExe, $garnetData, $garnetLog)
  if ($null -eq (Get-ServiceRecord 'MatrizGarnet')) { Invoke-Sc @('create', 'MatrizGarnet', "binPath= $garnetBinPath", 'start= delayed-auto', 'DisplayName= Matriz Garnet') }

  $natsConfig = Join-Path $managedRoot 'nats\nats.conf'
  $natsLog = Join-Path $natsLogs 'service.log'
  $natsConfigText = "server_name: MatrizNats`r`nhost: 127.0.0.1`r`nport: 54222`r`nhttp: 127.0.0.1:58222`r`njetstream { store_dir: `"$($natsData.Replace('\','/'))`" }`r`nlog_file: `"$($natsLog.Replace('\','/'))`"`r`n"
  [IO.File]::WriteAllText($natsConfig, $natsConfigText, [Text.UTF8Encoding]::new($false))
  $natsExe = Join-Path $natsTarget 'nats-server.exe'
  $natsBinPath = ('"{0}" -c "{1}"' -f $natsExe, $natsConfig)
  if ($null -eq (Get-ServiceRecord 'MatrizNats')) { Invoke-Sc @('create', 'MatrizNats', "binPath= $natsBinPath", 'start= delayed-auto', 'DisplayName= Matriz NATS JetStream') }

  foreach ($name in @('MatrizPostgres17', 'MatrizGarnet', 'MatrizNats')) {
    Invoke-Sc @('config', $name, 'start= delayed-auto', "obj= NT SERVICE\$name", 'password=')
    & icacls.exe $managedRoot /grant "NT SERVICE\${name}:(OI)(CI)(RX)" | Out-Null
  }
  & icacls.exe (Join-Path $managedRoot 'postgres') /grant "NT SERVICE\MatrizPostgres17:(OI)(CI)(M)" | Out-Null
  & icacls.exe (Join-Path $managedRoot 'garnet') /grant "NT SERVICE\MatrizGarnet:(OI)(CI)(M)" | Out-Null
  & icacls.exe (Join-Path $managedRoot 'nats') /grant "NT SERVICE\MatrizNats:(OI)(CI)(M)" | Out-Null

  $installerAccount = "$env:USERDOMAIN\$env:USERNAME"
  & icacls.exe $backupRoot /inheritance:r /grant:r "${installerAccount}:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)" | Out-Null
  $recoveryHelperSource = Join-Path $PSScriptRoot 'database-recovery-helper.ps1'
  $recoveryHelperTarget = Join-Path $controlRoot 'database-recovery-helper.ps1'
  if (-not (Test-Path -LiteralPath $recoveryHelperSource)) { throw "Database recovery helper is missing from the signed application resources." }
  Copy-Item -LiteralPath $recoveryHelperSource -Destination $recoveryHelperTarget -Force
  $dailyAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -Action DailyBackup' -f $recoveryHelperTarget)
  $dailyTrigger = New-ScheduledTaskTrigger -Daily -At '03:00'
  $dailyPrincipal = New-ScheduledTaskPrincipal -UserId $installerAccount -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName 'MatrizDatabaseDailyBackup' -Action $dailyAction -Trigger $dailyTrigger -Principal $dailyPrincipal -Description 'Daily logical backup of the managed Matriz database.' -Force | Out-Null

  $installerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  foreach ($name in @('MatrizPostgres17', 'MatrizGarnet', 'MatrizNats')) { Grant-ServiceControl $name $installerSid }

  $receipt = @{
    schemaVersion = 'v1'
    installedAt = [DateTime]::UtcNow.ToString('o')
    installerSid = $installerSid
    services = @('MatrizPostgres17', 'MatrizGarnet', 'MatrizNats')
    ports = @(55432, 56379, 54222, 58222)
    garnetSha256 = $artifacts[0].Sha256
    natsSha256 = $artifacts[1].Sha256
  } | ConvertTo-Json -Depth 3
  [IO.File]::WriteAllText((Join-Path $managedRoot 'installation-receipt.json'), $receipt, [Text.UTF8Encoding]::new($false))

  Invoke-Sc @('start', 'MatrizPostgres17')
  $postgresReady = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    & $pgCtl status -D $postgresData | Out-Null
    if ($LASTEXITCODE -eq 0) { $postgresReady = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $postgresReady) { throw "Managed PostgreSQL did not become ready." }

  $databaseExists = "SELECT 1 FROM pg_database WHERE datname = 'matriz';"
  $previousPgPassword = $env:PGPASSWORD
  try {
    $env:PGPASSWORD = $bootstrapPassword
    $result = $databaseExists | & $psql --host 127.0.0.1 --port 55432 --username matriz_provisioner --dbname postgres --no-password --tuples-only --no-align
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect the managed PostgreSQL database." }
  }
  finally { $env:PGPASSWORD = $previousPgPassword }
  if (($result | Out-String).Trim() -ne '1') { Invoke-Psql $psql 'postgres' $bootstrapPassword 'CREATE DATABASE matriz OWNER matriz_provisioner;' }

  $roleSecretPath = Join-Path $vaultRoot 'database-roles.dpapi'
  if (Test-Path -LiteralPath $roleSecretPath) { $roleSecrets = Unprotect-LocalSecret $roleSecretPath | ConvertFrom-Json -AsHashtable }
  else {
    $roleSecrets = @{}
    foreach ($schema in @('core','hub','spot','seumei','contracts','willdash','ops','pay')) {
      $roleSecrets["matriz_${schema}_migration"] = New-DatabaseSecret
      $roleSecrets["matriz_${schema}_runtime"] = New-DatabaseSecret
    }
    Protect-LocalSecret ($roleSecrets | ConvertTo-Json -Compress) $roleSecretPath
  }
  $topologySql = "REVOKE ALL ON DATABASE matriz FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC;"
  foreach ($schema in @('core','hub','spot','seumei','contracts','willdash','ops','pay')) {
    $migrationRole = "matriz_${schema}_migration"
    $runtimeRole = "matriz_${schema}_runtime"
    $migrationSecret = $roleSecrets[$migrationRole].Replace("'", "''")
    $runtimeSecret = $roleSecrets[$runtimeRole].Replace("'", "''")
    $topologySql += " DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$migrationRole') THEN CREATE ROLE $migrationRole LOGIN PASSWORD '$migrationSecret' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$runtimeRole') THEN CREATE ROLE $runtimeRole LOGIN PASSWORD '$runtimeSecret' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS; END IF; END `$`$; GRANT CONNECT ON DATABASE matriz TO $migrationRole, $runtimeRole; CREATE SCHEMA IF NOT EXISTS $schema AUTHORIZATION $migrationRole; ALTER SCHEMA $schema OWNER TO $migrationRole; REVOKE ALL ON SCHEMA $schema FROM PUBLIC; GRANT USAGE ON SCHEMA $schema TO $runtimeRole;"
  }
  Invoke-Psql $psql 'matriz' $bootstrapPassword $topologySql

  Invoke-Sc @('start', 'MatrizGarnet')
  Invoke-Sc @('start', 'MatrizNats')
}
finally {
  if (Test-Path -LiteralPath $stagingRoot) { Remove-Item -LiteralPath $stagingRoot -Recurse -Force }
}
