#!/bin/bash

set -euo pipefail

if grep -ri fixme src; then
	echo "Found 'FIXME' in source code. Please fix them or remove them." >&2
	exit 1
fi
