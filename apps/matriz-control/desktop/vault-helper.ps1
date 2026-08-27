param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("status", "provision", "unlock", "lock")]
  [string]$Operation,
  [Parameter(Mandatory = $true)][string]$VhdxPath,
  [Parameter(Mandatory = $true)][string]$MountPath,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Result([bool]$Supported, [bool]$Provisioned, [bool]$Mounted, [string]$Reason, [string]$RecoveryKey) {
  $value = [ordered]@{ supported = $Supported; provisioned = $Provisioned; mounted = $Mounted; mountPath = $(if ($Mounted) { $MountPath } else { $null }); reason = $(if ($Reason) { $Reason } else { $null }) }
  if ($RecoveryKey) { $value.recoveryKey = $RecoveryKey }
  $value | ConvertTo-Json -Compress
}

if ([System.IO.Path]::GetExtension($VhdxPath) -ne ".vhdx") { throw "Vault path must be a VHDX file." }
$fullVhdx = [System.IO.Path]::GetFullPath($VhdxPath)
$fullMount = [System.IO.Path]::GetFullPath($MountPath)
if ([System.IO.Path]::GetPathRoot($fullMount) -eq $fullMount) { throw "Mount path cannot be a filesystem root." }

$required = @("Get-BitLockerVolume", "Enable-BitLocker", "Unlock-BitLocker", "Mount-DiskImage", "Dismount-DiskImage")
$missing = @($required | Where-Object { -not (Get-Command $_ -ErrorAction SilentlyContinue) })
if ($missing.Count -gt 0) { Write-Result $false (Test-Path -LiteralPath $fullVhdx) $false ("Missing Windows commands: " + ($missing -join ", ")) ""; exit 0 }

if ($DryRun) { Write-Result $true (Test-Path -LiteralPath $fullVhdx) $false "Dry run only; no disk state changed." ""; exit 0 }

New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($fullVhdx)) | Out-Null
New-Item -ItemType Directory -Force -Path $fullMount | Out-Null

if ($Operation -eq "status") {
  $image = Get-DiskImage -ImagePath $fullVhdx -ErrorAction SilentlyContinue
  $attached = [bool]($image -and $image.Attached)
  $bitlocker = $(if ($attached) { Get-BitLockerVolume -MountPoint $fullMount -ErrorAction SilentlyContinue } else { $null })
  $mounted = [bool]($attached -and $bitlocker -and $bitlocker.LockStatus -eq "Unlocked")
  $reason = $(if ($attached -and -not $mounted) { "The VHDX is attached but the BitLocker volume is not unlocked at the expected access path." } else { "" })
  Write-Result $true (Test-Path -LiteralPath $fullVhdx) $mounted $reason ""
  exit 0
}

if ($Operation -eq "provision") {
  $recoveryKey = [Console]::In.ReadLine()
  if (-not $recoveryKey) { throw "Recovery key was not provided on stdin." }
  if (Test-Path -LiteralPath $fullVhdx) { throw "Vault VHDX already exists." }
  if (-not (Get-Command New-VHD -ErrorAction SilentlyContinue)) { throw "New-VHD is unavailable. Enable the Hyper-V PowerShell feature first." }
  New-VHD -Path $fullVhdx -Dynamic -SizeBytes 20GB | Out-Null
  $image = Mount-DiskImage -ImagePath $fullVhdx -PassThru
  $disk = $image | Get-Disk
  Initialize-Disk -Number $disk.Number -PartitionStyle GPT -PassThru | Out-Null
  $partition = New-Partition -DiskNumber $disk.Number -UseMaximumSize
  Format-Volume -Partition $partition -FileSystem NTFS -NewFileSystemLabel "MatrizControlVault" -Confirm:$false | Out-Null
  Add-PartitionAccessPath -DiskNumber $disk.Number -PartitionNumber $partition.PartitionNumber -AccessPath $fullMount
  Enable-BitLocker -MountPoint $fullMount -EncryptionMethod XtsAes256 -RecoveryPasswordProtector -RecoveryPassword $recoveryKey -UsedSpaceOnly -SkipHardwareTest | Out-Null
  Write-Result $true $true $true "" ""
  exit 0
}

if (-not (Test-Path -LiteralPath $fullVhdx)) { throw "Vault VHDX does not exist." }

if ($Operation -eq "unlock") {
  $recoveryKey = [Console]::In.ReadLine()
  if (-not $recoveryKey) { throw "Recovery key was not provided on stdin." }
  $image = Mount-DiskImage -ImagePath $fullVhdx -PassThru
  $disk = $image | Get-Disk
  $partition = Get-Partition -DiskNumber $disk.Number | Where-Object { $_.Type -ne "Reserved" } | Select-Object -First 1
  Add-PartitionAccessPath -DiskNumber $disk.Number -PartitionNumber $partition.PartitionNumber -AccessPath $fullMount -ErrorAction SilentlyContinue
  Unlock-BitLocker -MountPoint $fullMount -RecoveryPassword (ConvertTo-SecureString $recoveryKey -AsPlainText -Force) | Out-Null
  $volume = Get-BitLockerVolume -MountPoint $fullMount
  if ($volume.LockStatus -ne "Unlocked") { throw "BitLocker did not unlock the mounted volume." }
  Write-Result $true $true $true "" ""
  exit 0
}

if ($Operation -eq "lock") {
  Dismount-DiskImage -ImagePath $fullVhdx
  Write-Result $true $true $false "" ""
}
