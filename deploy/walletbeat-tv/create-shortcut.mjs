import * as fs from 'node:fs'
import * as path from 'node:path'

export function createShortcut({
	platform,
	desktopDirectory,
	dataDirectory,
	launcherSource,
	uninstallerSource,
	siteUrl,
}) {
	const launcherDirectory = path.join(dataDirectory, 'walletbeat-tv')
	const save = (filename, contents) => {
		fs.mkdirSync(path.dirname(filename), { recursive: true })
		if (fs.existsSync(filename) && fs.readFileSync(filename, 'utf8') === contents) {
			return
		}
		const temporary = `${filename}.tmp`
		try {
			fs.writeFileSync(temporary, contents, { mode: 0o755 })
			fs.renameSync(temporary, filename)
		} finally {
			fs.rmSync(temporary, { force: true })
		}
	}
	if (uninstallerSource) {
		save(
			path.join(
				launcherDirectory,
				`uninstall-walletbeat-tv.${platform === 'win32' ? 'ps1' : 'sh'}`,
			),
			uninstallerSource,
		)
	}
	if (platform === 'win32') {
		const launcher = path.join(launcherDirectory, 'walletbeat-tv.ps1')
		save(launcher, launcherSource)
		const quote = value => `'${value.replaceAll("'", "''")}'`
		const command = `$ErrorActionPreference = 'Stop'
while ($true) {
    try {
        & ([ScriptBlock]::Create((Get-Content -LiteralPath ${quote(launcher)} -Raw))) -Url ${quote(siteUrl)}
        break
    } catch {
        Write-Host $_ -ForegroundColor Red
        if ([Console]::IsInputRedirected) { exit 1 }
        if ((Read-Host 'Press Enter to retry Walletbeat TV, or type Q to quit') -eq 'q') { exit 1 }
    }
}`
		const shortcut = path.join(desktopDirectory, 'Walletbeat TV.cmd')
		save(
			shortcut,
			`@echo off\r\npowershell.exe -NoLogo -NoProfile -EncodedCommand ${Buffer.from(command, 'utf16le').toString('base64')}\r\n`,
		)
		return shortcut
	}
	const launcher = path.join(launcherDirectory, 'walletbeat-tv.sh')
	save(launcher, launcherSource)
	const quote = value => `'${value.replaceAll("'", "'\\''")}'`
	const retry = `#!/bin/sh
trap 'exit 130' INT
trap 'exit 143' HUP TERM
while :; do
    /bin/sh ${quote(launcher)} ${quote(siteUrl)}
    status=$?
    case "$status" in 0|130|143) exit 0 ;; esac
    printf '\\nWalletbeat TV stopped. Press Enter to retry, or type Q to quit: '
    IFS= read -r answer || exit "$status"
    case "$answer" in q|Q) exit "$status" ;; esac
done
`
	if (platform === 'darwin') {
		const shortcut = path.join(desktopDirectory, 'Walletbeat TV.command')
		save(shortcut, retry)
		return shortcut
	}
	const openScript = path.join(launcherDirectory, 'open-walletbeat-tv.sh')
	save(openScript, retry)
	// Desktop entries parse string escapes before command-line quoting and field codes.
	const argument = openScript
		.replace(/[\\`"$]/g, character => `\\${character}`)
		.replaceAll('%', '%%')
		.replaceAll('\\', '\\\\')
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '\\r')
	const shortcut = path.join(dataDirectory, 'applications/walletbeat-tv.desktop')
	save(
		shortcut,
		`[Desktop Entry]\nType=Application\nName=Walletbeat TV\nComment=Open the Walletbeat TV showcase\nExec=/bin/sh "${argument}"\nTerminal=true\nCategories=Network;\n`,
	)
	return shortcut
}
