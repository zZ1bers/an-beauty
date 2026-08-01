# Restore Postgres from a custom-format dump (Windows)
param(
  [Parameter(Mandatory = $true)]
  [string]$Dump,
  [string]$Container = "anbeauty-db",
  [string]$DbUser = "anbeauty",
  [string]$DbName = "anbeauty"
)

$ErrorActionPreference = "Stop"

function Resolve-Docker {
  $cmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
    "$env:ProgramFiles\Docker\Docker\resources\docker.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return $c }
  }
  return $null
}

$Docker = Resolve-Docker
if (-not $Docker) {
  Write-Error "docker CLI not found. Install Docker Desktop or add docker to PATH."
}

if (-not (Test-Path -LiteralPath $Dump)) {
  Write-Error "Dump file not found: $Dump"
}

$running = & $Docker inspect $Container --format='{{.State.Running}}' 2>$null
if ($running -ne "true") {
  Write-Error "Container $Container is not running"
}

Write-Host "WARNING: This will DROP and recreate schema data in database '$DbName'."
Write-Host "Dump: $Dump"
$confirm = Read-Host "Type YES to continue"
if ($confirm -ne "YES") {
  Write-Host "Aborted."
  exit 1
}

$remote = "/tmp/anbeauty-restore.dump"
& $Docker cp $Dump "${Container}:${remote}"

$sql = @"
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
"@

$sql | & $Docker exec -i $Container psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1
& $Docker exec $Container pg_restore -U $DbUser -d $DbName --no-owner --no-acl $remote
& $Docker exec $Container rm -f $remote | Out-Null

Write-Host "Restore complete. If the API schema is behind, run: npm run db:deploy"
