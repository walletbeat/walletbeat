#!/bin/bash

set -euo pipefail

if grep -F '?:' src/schema/features.ts; then
	echo "Found '?:' in src/schema/features.ts, indicating a possibly-undefined feature field." >&2
	echo 'Please ensure all wallet feature fields are defined.' >&2
	echo 'Yes, you will need to retroactiely add it to all existing wallet objects.' >&2
	exit 1
fi
