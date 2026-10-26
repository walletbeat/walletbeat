param([string]$Url, [switch]$Check, [switch]$CheckHeaded)

function Assert-FreeSpace([string]$Path, [long]$RequiredBytes) {
    $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot([IO.Path]::GetFullPath($Path)))
    if ($drive.AvailableFreeSpace -lt $RequiredBytes) {
        throw "Walletbeat TV needs at least $($RequiredBytes / 1MB) MiB free at $Path. Free disk space and rerun the same command."
    }
}

function Start-WalletbeatTV {
    $ErrorActionPreference = 'Stop'
    $architecture = $env:PROCESSOR_ARCHITEW6432
    if (-not $architecture) { $architecture = $env:PROCESSOR_ARCHITECTURE }
    switch ($architecture) {
        'ARM64' { $nodeArchitecture = 'arm64' }
        'AMD64' { $nodeArchitecture = 'x64' }
        default { throw 'Walletbeat TV requires 64-bit Windows 11 or later.' }
    }
    $installationDirectory = Join-Path ([IO.Path]::GetTempPath()) ('walletbeat-tv-' + [Guid]::NewGuid().ToString('N'))
    Assert-FreeSpace ([IO.Path]::GetTempPath()) 16MB
    New-Item -ItemType Directory -Path $installationDirectory | Out-Null
    $launchLock = $null
    try {
        $nodeVersion = '@NODE_VERSION@'
        $cacheDirectory = Join-Path $env:LOCALAPPDATA 'walletbeat-tv'
        Assert-FreeSpace $cacheDirectory 16MB
        New-Item -ItemType Directory -Force -Path $cacheDirectory | Out-Null
        try {
            $launchLock = [IO.File]::Open((Join-Path $cacheDirectory 'launch.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        } catch [IO.IOException] {
            if (($_.Exception.GetBaseException().HResult -band 0xFFFF) -in 32, 33) {
                throw 'Walletbeat TV is already running or installing. Close it before launching another.'
            }
            throw
        }
        $env:WALLETBEAT_TV_CACHE = $cacheDirectory
        if (-not $env:WALLETBEAT_TV_DESKTOP) { $env:WALLETBEAT_TV_DESKTOP = [Environment]::GetFolderPath('Desktop') }
        $runtimeProbe = Join-Path $installationDirectory 'runtime-probe.cjs'
        [IO.File]::WriteAllBytes($runtimeProbe, [Convert]::FromBase64String('@ENCODED_RUNTIME_PROBE@'))
        $nodeExecutable = $null
        if (Get-Command node -ErrorAction SilentlyContinue) {
            $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
            $npmCli = & node $runtimeProbe $npmCommand.Source 2>$null
            if ($npmCli) { $nodeExecutable = & node -p process.execPath }
        }
        if (-not $nodeExecutable) {
            $runtimeDirectory = Join-Path $cacheDirectory "node-$nodeVersion-win-$nodeArchitecture"
            $nodeExecutable = Join-Path $runtimeDirectory 'node.exe'
            $runtimeVersion = if (Test-Path -LiteralPath $nodeExecutable) { & $nodeExecutable --version }
            if ($runtimeVersion -ne $nodeVersion -or -not (Test-Path (Join-Path $runtimeDirectory 'node_modules/npm/bin/npm-cli.js'))) {
                Assert-FreeSpace $installationDirectory 256MB
                Assert-FreeSpace $cacheDirectory 256MB
                Write-Host 'Walletbeat TV: installing its runtime...'
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                $archive = "node-$nodeVersion-win-$nodeArchitecture.zip"
                $archivePath = Join-Path $installationDirectory $archive
                Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/$nodeVersion/$archive" -OutFile $archivePath
                $checksums = (Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/$nodeVersion/SHASUMS256.txt").Content
                $checksumLine = ($checksums -split "`n" | Where-Object { $_.Trim().EndsWith('  ' + $archive) })
                if (-not $checksumLine) { throw 'Node checksum is missing.' }
                $expected = ($checksumLine.Trim() -split '\s+')[0]
                if ((Get-FileHash -Algorithm SHA256 $archivePath).Hash.ToLowerInvariant() -ne $expected) {
                    throw 'Node checksum verification failed.'
                }
                Expand-Archive -LiteralPath $archivePath -DestinationPath $installationDirectory
                New-Item -ItemType Directory -Force -Path $cacheDirectory | Out-Null
                Remove-Item -LiteralPath $runtimeDirectory -Recurse -Force -ErrorAction SilentlyContinue
                Move-Item -LiteralPath (Join-Path $installationDirectory "node-$nodeVersion-win-$nodeArchitecture") -Destination $runtimeDirectory
                Remove-Item -LiteralPath $archivePath
            }
            $npmCli = Join-Path $runtimeDirectory 'node_modules/npm/bin/npm-cli.js'
        }
        $env:WALLETBEAT_TV_NPM_CLI = $npmCli
        Write-Host "Walletbeat TV: using runtime $nodeExecutable"
        $installationScript = Join-Path $installationDirectory 'install.mjs'
        [IO.File]::WriteAllBytes($installationScript, [Convert]::FromBase64String(@'
@INSTALLATION_SCRIPT@
'@
        ))
        $launchArguments = @()
        if ($Url) { $launchArguments += $Url }
        if ($Check) { $launchArguments += '--check' }
        if ($CheckHeaded) { $launchArguments += '--check-headed' }
        & $nodeExecutable $installationScript @launchArguments
        if ($LASTEXITCODE -ne 0) { throw "Walletbeat TV exited with status $LASTEXITCODE." }
    }
    finally {
        if ($launchLock) { $launchLock.Dispose() }
        for ($attempt = 0; $attempt -lt 10 -and (Test-Path -LiteralPath $installationDirectory); $attempt++) {
            Remove-Item -LiteralPath $installationDirectory -Recurse -Force -ErrorAction SilentlyContinue
            if (Test-Path -LiteralPath $installationDirectory) { Start-Sleep -Milliseconds 200 }
        }
        if (Test-Path -LiteralPath $installationDirectory) { Write-Warning "Temporary files remain at $installationDirectory." }
    }
}

Start-WalletbeatTV
