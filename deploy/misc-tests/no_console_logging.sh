#!/bin/bash

set -euo pipefail

if grep -rE 'console\.(log|warn|error)' src; then
	echo 'Found console logging functions in source code.' >&2
	echo 'These are useful during development, but should never occur in working code.' >&2
	echo 'If these correspond to legitimate error conditions, use `throw`.' >&2
	echo 'Otherwise, please remove.' >&2
	exit 1
fi
