# Installs the Chocolatey packages listed in windows-packages.txt.
# `choco install` can exit 0 without installing anything, so each package is checked afterwards.
$packages = @(Get-Content "$PSScriptRoot/windows-packages.txt" | Where-Object { $_.Trim() })
foreach ($attempt in 1..3) {
	choco install $packages -y --no-progress
	$missing = @($packages | Where-Object { -not (choco list --exact --limit-output $_) })
	if ($missing.Count -eq 0) {
		exit 0
	}
	Write-Host "Attempt ${attempt}: not installed: $($missing -join ', ')"
	Start-Sleep -Seconds 30
}
throw "Chocolatey failed to install: $($missing -join ', ')"
