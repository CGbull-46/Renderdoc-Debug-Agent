param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host "== $Title =="
}

function Scan-Secrets([string]$Path) {
  Write-Section "Secret Scan"
  $patterns = @(
    'sk-[A-Za-z0-9]{16,}',
    'Bearer\\s+sk-[A-Za-z0-9]{16,}',
    'apiKey\\s*[:=]\\s*[\"''][^\"'']{16,}[\"'']'
  )

  $scanExt = @(
    ".md", ".txt",
    ".js", ".ts", ".tsx", ".json",
    ".py", ".ps1", ".bat", ".cmd",
    ".yml", ".yaml"
  )

  $gitDir = Join-Path $Path ".git"
  $paths = @()
  if (Test-Path $gitDir) {
    try {
      $paths = & git -C $Path ls-files
    } catch {
      $paths = @()
    }
  }

  $files = @()
  if ($paths.Count -gt 0) {
    foreach ($rel in $paths) {
      $ext = [System.IO.Path]::GetExtension($rel)
      if ($scanExt -notcontains $ext) { continue }
      $full = Join-Path $Path $rel
      if (Test-Path $full) { $files += $full }
    }
  } else {
    $files = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $scanExt -contains $_.Extension } |
      Select-Object -ExpandProperty FullName
  }

  $hits = @()
  foreach ($file in $files) {
    try {
      $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    } catch {
      continue
    }
    foreach ($pat in $patterns) {
      if ($content -match $pat) {
        $hits += "$file :: $pat"
      }
    }
  }

  if ($hits.Count -eq 0) {
    Write-Host "OK: no obvious secrets found."
  } else {
    Write-Host "FOUND:"
    $hits | Sort-Object | ForEach-Object { Write-Host "  $_" }
    exit 2
  }
}

function Scan-QuestionMarks([string]$Path) {
  Write-Section "Encoding/QuestionMark Scan"
  $targets = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in @(".md", ".txt") }

  $hits = @()
  foreach ($file in $targets) {
    try {
      $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    } catch {
      continue
    }
    if ($null -eq $content) { continue }
    if ($content -match "[?]{3,}" ) {
      $hits += $file.FullName
    }
  }

  if ($hits.Count -eq 0) {
    Write-Host "OK: no '???' sequences found in markdown/text."
  } else {
    Write-Host "FOUND possible garbling files:"
    $hits | Sort-Object | ForEach-Object { Write-Host "  $_" }
    Write-Host "Hint: check PowerShell code page / UTF-8 write-back."
    exit 3
  }
}

Write-Section "Agent Checks"
Write-Host "Root: $Root"

Scan-Secrets $Root
Scan-QuestionMarks (Join-Path $Root "agent-workbench")

Write-Host ""
Write-Host "All checks passed."
