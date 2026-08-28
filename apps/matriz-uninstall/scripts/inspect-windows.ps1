$ErrorActionPreference = "Stop"
$roots = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
Get-ItemProperty $roots -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -match "^(Matriz|Seu ?Mei)" } |
  Select-Object DisplayName, Publisher, DisplayVersion, InstallLocation, QuietUninstallString, UninstallString |
  Sort-Object DisplayName |
  ConvertTo-Json -Depth 4
