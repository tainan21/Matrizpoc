param(
  [Parameter(Mandatory = $true)][ValidateSet('core','hub','spot','seumei','contracts','willdash','ops','pay')][string]$Schema
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$psql = Join-Path $env:ProgramFiles 'PostgreSQL\17\bin\psql.exe'
$secretFile = Join-Path $env:LOCALAPPDATA 'Matriz\Control\vault\bootstrap-postgres.dpapi'
if (-not (Test-Path -LiteralPath $psql) -or -not (Test-Path -LiteralPath $secretFile)) { throw 'Managed migration authority is unavailable.' }

$secure = Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }

$previous = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $password
  $relation = ('SELECT to_regclass(''"{0}"."_prisma_migrations"'');' -f $Schema) | & $psql --host 127.0.0.1 --port 55432 --username matriz_provisioner --dbname matriz --no-password --tuples-only --no-align --set ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the managed migration ledger.' }
  if ([string]::IsNullOrWhiteSpace(($relation | Out-String).Trim())) { '[]'; exit 0 }
  $sql = 'SELECT COALESCE(json_agg(json_build_object(''name'', migration_name, ''checksum'', checksum, ''finished'', finished_at IS NOT NULL, ''rolledBack'', rolled_back_at IS NOT NULL) ORDER BY started_at)::text, ''[]'') FROM "{0}"."_prisma_migrations";' -f $Schema
  $result = $sql | & $psql --host 127.0.0.1 --port 55432 --username matriz_provisioner --dbname matriz --no-password --tuples-only --no-align --set ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Could not read the managed migration ledger.' }
  ($result | Out-String).Trim()
}
finally { $env:PGPASSWORD = $previous }
