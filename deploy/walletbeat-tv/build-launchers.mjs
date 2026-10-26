#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const outputPrefix = process.argv[2]
if (!outputPrefix) {
	throw new Error('Usage: node deploy/walletbeat-tv/build-launchers.mjs /path/to/walletbeat-tv')
}
const nodeVersion = 'v24.22.1'
const projectManifest = JSON.parse(
	readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
)
const packageManifest = {
	name: 'walletbeat-tv',
	private: true,
	version: '1.0.0',
	dependencies: { '@playwright/test': projectManifest.devDependencies['@playwright/test'] },
}
const runtimeProbe = `const fs = require("node:fs"), path = require("node:path");
if (![22, 24, 26].includes(Number(process.versions.node.split(".")[0]))) process.exit(1);
const npmCommand = process.argv[2];
const candidates = [path.resolve(path.dirname(process.execPath), process.platform === "win32" ? "node_modules/npm/bin/npm-cli.js" : "../lib/node_modules/npm/bin/npm-cli.js")];
if (npmCommand && fs.existsSync(npmCommand)) {
 const target = fs.realpathSync(npmCommand);
 if (target.endsWith("npm-cli.js")) candidates.unshift(target);
 candidates.push(path.join(path.dirname(npmCommand), "node_modules/npm/bin/npm-cli.js"));
}
const npmCli = candidates.find(candidate => fs.existsSync(candidate));
if (!npmCli) process.exit(1);
process.stdout.write(npmCli);`
const encode = value => Buffer.from(value).toString('base64')
const templates = Object.fromEntries(
	['sh', 'ps1'].map(extension => [
		extension,
		readFileSync(new URL(`./launcher.${extension}`, import.meta.url), 'utf8')
			.replaceAll('@NODE_VERSION@', nodeVersion)
			.replaceAll('@RUNTIME_PROBE@', runtimeProbe)
			.replaceAll('@ENCODED_RUNTIME_PROBE@', encode(runtimeProbe)),
	]),
)
const installationScript = readFileSync(new URL('./install.mjs', import.meta.url), 'utf8')
	.replace('@TOUR_SOURCE@', encode(readFileSync(new URL('./tour.mjs', import.meta.url))))
	.replace('@PACKAGE_MANIFEST@', encode(JSON.stringify(packageManifest, null, 2)))
	.replace('@LAUNCHER_TEMPLATES@', encode(JSON.stringify(templates)))
	.replace(
		'// @SHORTCUT_SCRIPT@',
		readFileSync(new URL('./create-shortcut.mjs', import.meta.url), 'utf8').replace(
			'export function createShortcut',
			'function createShortcut',
		),
	)
const encodedInstallationScript = encode(installationScript)
	.match(/.{1,76}/g)
	.join('\n')
for (const extension of ['sh', 'ps1']) {
	const launcher = templates[extension].replace('@INSTALLATION_SCRIPT@', encodedInstallationScript)
	writeFileSync(`${outputPrefix}.${extension}`, launcher, { mode: 0o755 })
	console.log(`Walletbeat TV launcher: ${resolve(`${outputPrefix}.${extension}`)}`)
}
