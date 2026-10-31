$ErrorActionPreference = 'Stop'
$cacheDirectory = Join-Path $env:LOCALAPPDATA 'walletbeat-tv'
$dataDirectory = Join-Path $env:APPDATA 'walletbeat-tv'
$desktop = if ($env:WALLETBEAT_TV_DESKTOP) { $env:WALLETBEAT_TV_DESKTOP } else { [Environment]::GetFolderPath('Desktop') }
$launchLock = $null
try {
    if (Test-Path -LiteralPath $cacheDirectory) {
        try {
            $launchLock = [IO.File]::Open((Join-Path $cacheDirectory 'launch.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        } catch [IO.IOException] {
            throw 'Close Walletbeat TV before uninstalling.'
        }
    }
    $shortcut = Join-Path $desktop 'Walletbeat TV.cmd'
    if (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut -Force }
    if (Test-Path -LiteralPath $dataDirectory) { Remove-Item -LiteralPath $dataDirectory -Recurse -Force }
    if (Test-Path -LiteralPath $cacheDirectory) {
        Get-ChildItem -LiteralPath $cacheDirectory -Force | Where-Object { $_.Name -ne 'launch.lock' } | Remove-Item -Recurse -Force
    }
} finally {
    if ($launchLock) { $launchLock.Dispose() }
}
if (Test-Path -LiteralPath $cacheDirectory) { Remove-Item -LiteralPath $cacheDirectory -Recurse -Force }
Write-Host 'Walletbeat TV uninstalled. Shared browsers and system packages were kept.'
