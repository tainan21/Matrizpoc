$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Unprotect([string]$Path) { $secure=Get-Content -LiteralPath $Path -Raw|ConvertTo-SecureString; $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)} }
$secretFile=Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault\bootstrap-postgres.dpapi'
$roleFile=Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault\database-roles.dpapi'
$psql=Join-Path $env:ProgramFiles 'PostgreSQL\17\bin\psql.exe'
if(-not(Test-Path -LiteralPath $secretFile)-or-not(Test-Path -LiteralPath $psql)){ throw 'Managed diagnostic authority is unavailable.' }
$previous=$env:PGPASSWORD
try {
  $env:PGPASSWORD=Unprotect $secretFile
  $configured=@{}
  if(Test-Path -LiteralPath $roleFile){ $roles=Unprotect $roleFile|ConvertFrom-Json; foreach($domain in @('pay','seumei','hub')){$configured[$domain]=$null-ne $roles.PSObject.Properties["matriz_${domain}_worker"]} }
  $rows=@()
  foreach($domain in @('pay','seumei','hub')){
    $sql="SELECT CASE WHEN to_regclass('$domain.outbox_events') IS NULL THEN '0||0|0' ELSE (SELECT count(*)::text || '|' || coalesce(min(`"occurredAt`") FILTER (WHERE `"publishedAt`" IS NULL AND `"deadLetteredAt`" IS NULL)::text,'') || '|' || count(*) FILTER (WHERE attempts > 1 AND `"publishedAt`" IS NULL AND `"deadLetteredAt`" IS NULL)::text || '|' || count(*) FILTER (WHERE `"deadLetteredAt`" IS NOT NULL)::text FROM $domain.outbox_events) END;"
    $raw=($sql|& $psql --host 127.0.0.1 --port 55432 --username matriz_provisioner --dbname matriz --no-password --tuples-only --no-align|Out-String).Trim(); if($LASTEXITCODE-ne 0){throw 'Outbox diagnostic query failed.'}
    $parts=$raw-split '\|',4; $rows+=@{domain=$domain;pending=[int]$parts[0];oldestOccurredAt=if($parts[1]){$parts[1]}else{$null};retries=[int]$parts[2];deadLetters=[int]$parts[3];workerConfigured=($configured[$domain]-eq $true)}
  }
  [Console]::Out.Write(($rows|ConvertTo-Json -Compress))
} finally { $env:PGPASSWORD=$previous }
