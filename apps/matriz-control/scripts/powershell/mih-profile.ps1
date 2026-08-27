$script:MihWorkspaceRoot = 'C:\Apps\matriz-infra-hub'
$script:MihProjects = @{ control = 'matriz-control'; hub = 'matriz-hub' }
$script:MihGitCache = @{ path = ''; value = ''; expires = [datetime]::MinValue }

function global:mih {
    param([Parameter(Position = 0)][string]$Project)
    if ([string]::IsNullOrWhiteSpace($Project)) { Set-Location -LiteralPath $script:MihWorkspaceRoot; return }
    $key = $Project.ToLowerInvariant()
    $id = if ($script:MihProjects.ContainsKey($key)) { $script:MihProjects[$key] } else { $key }
    $target = Join-Path $script:MihWorkspaceRoot "apps\$id"
    if (Test-Path -LiteralPath (Join-Path $target 'package.json')) { Set-Location -LiteralPath $target; return }
    Write-Error "projeto mih desconhecido: $key"
}

function global:prompt {
    $physical = $executionContext.SessionState.Path.CurrentLocation.ProviderPath -replace '^\\\\\?\\', ''
    $relative = if ($physical.StartsWith($script:MihWorkspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) { $physical.Substring($script:MihWorkspaceRoot.Length).TrimStart('\', '/') } else { $null }
    $display = if ($null -ne $relative) { if ($relative) { "mih/$($relative -replace '\\', '/')" } else { 'mih' } } else { $physical }
    $git = ''
    if ($null -ne $relative) {
        if ($script:MihGitCache.path -ne $physical -or $script:MihGitCache.expires -lt [datetime]::UtcNow) {
            $branch = (& git -C $physical branch --show-current 2>$null)
            $dirty = (& git -C $physical status --porcelain --untracked-files=normal 2>$null)
            $script:MihGitCache = @{ path = $physical; value = if ($branch) { " [$branch$(if ($dirty) {'*'})]" } else { '' }; expires = [datetime]::UtcNow.AddSeconds(2) }
        }
        $git = $script:MihGitCache.value
    }
    "ps $($display.ToLowerInvariant())$git$('>' * ($nestedPromptLevel + 1)) "
}

Remove-Item Alias:cd -Force -ErrorAction SilentlyContinue
function global:cd { param([Parameter(Position = 0)][string]$Path); if ([string]::IsNullOrWhiteSpace($Path)) { Set-Location -LiteralPath $HOME } elseif ($Path.Equals('mih',[System.StringComparison]::OrdinalIgnoreCase)) { mih } else { Set-Location -Path $Path } }
if (Test-Path -LiteralPath $script:MihWorkspaceRoot) { Set-Location -LiteralPath $script:MihWorkspaceRoot }
