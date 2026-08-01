# Daily Postgres backup for Docker container anbeauty-db (Windows / Task Scheduler)
param(
  [string]$BackupDir = "",
  [string]$Container = "anbeauty-db",
  [string]$DbUser = "anbeauty",
  [string]$DbName = "anbeauty",
  [int]$KeepDays = 14
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $BackupDir) { $BackupDir = Join-Path $Root "backups" }

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

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$running = & $Docker inspect $Container --format='{{.State.Running}}' 2>$null
if ($running -ne "true") {
  Write-Error "Container $Container is not running"
}

$stamp = Get-Date -Format "yyyy-MM-dd"
$out = Join-Path $BackupDir "anbeauty-$stamp.dump"
$remote = "/tmp/anbeauty-backup.dump"

Write-Host "Backing up $DbName from $Container -> $out"
& $Docker exec $Container pg_dump -U $DbUser -d $DbName -Fc -f $remote
if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Force }
& $Docker cp "${Container}:${remote}" $out
& $Docker exec $Container rm -f $remote | Out-Null

# Prune old dumps
Get-ChildItem -Path $BackupDir -Filter "anbeauty-*.dump" -File |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
  ForEach-Object {
    Write-Host "Removing old backup $($_.Name)"
    Remove-Item $_.FullName -Force
  }

$size = (Get-Item $out).Length
Write-Host "Done. Size: $size bytes"
Write-Host "Keep last $KeepDays days in $BackupDir"
Write-Host "Tip: copy dumps off-host. Docker volume alone is not a backup."
