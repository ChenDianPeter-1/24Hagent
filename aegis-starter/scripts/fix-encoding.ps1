<#
.SYNOPSIS
    Adds UTF-8 BOM to PowerShell script files so PS 5.1 can parse them.
.DESCRIPTION
    PS 5.1 requires BOM (EF BB BF) to correctly parse UTF-8 .ps1 files.
    Without BOM, non-ASCII characters and certain regex patterns cause
    parser errors. This script adds BOM if not already present.
.PARAMETER Path
    Path to the .ps1 file. Accepts wildcards.
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$Path
)

$files = Get-ChildItem -Path $Path -ErrorAction SilentlyContinue
if (-not $files) {
    Write-Error "No files found matching: $Path"
    exit 1
}

foreach ($file in $files) {
    if ($file.Extension -ne ".ps1") {
        Write-Warning "Not a .ps1 file, skipping: $($file.Name)"
        continue
    }
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        Write-Host "BOM already present: $($file.Name)"
        continue
    }
    $withBom = [byte[]]@(0xEF, 0xBB, 0xBF) + $bytes
    [System.IO.File]::WriteAllBytes($file.FullName, $withBom)
    Write-Host "BOM added: $($file.Name)"
}
