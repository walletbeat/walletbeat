$ErrorActionPreference = 'Stop'
$cacheDirectory = Join-Path $env:LOCALAPPDATA 'walletbeat-tv'
$dataDirectory = Join-Path $env:APPDATA 'walletbeat-tv'
$desktop = if ($env:WALLETBEAT_TV_DESKTOP) { $env:WALLETBEAT_TV_DESKTOP } else { [Environment]::GetFolderPath('Desktop') }
$launchLock = $null
try {
    New-Item -ItemType Directory -Force -Path $env:LOCALAPPDATA | Out-Null
    try {
        $launchLock = [IO.File]::Open(($cacheDirectory + '.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    } catch [IO.IOException] {
        throw 'Close Walletbeat TV before uninstalling.'
    }
    $shortcut = Join-Path $desktop 'Walletbeat TV.cmd'
    if (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut -Force }
    if (Test-Path -LiteralPath $dataDirectory) { Remove-Item -LiteralPath $dataDirectory -Recurse -Force }
    if (Test-Path -LiteralPath $cacheDirectory) {
        Remove-Item -LiteralPath $cacheDirectory -Recurse -Force
    }
} finally {
    if ($launchLock) { $launchLock.Dispose() }
}
Write-Host 'Walletbeat TV uninstalled. Shared browsers and system packages were kept.'
