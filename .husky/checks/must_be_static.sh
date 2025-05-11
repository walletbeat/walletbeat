#!/bin/bash

set -euo pipefail

if ! grep -q "output: 'static'" astro.config.mjs; then
	echo "This site is intended to be fully static." >&2
	echo "Must set \`output: 'static'\` in \`astro.config.mjs\`." >&2
	exit 1
fi
