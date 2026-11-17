#!/bin/bash

set -euo pipefail

node --import tsx --input-type=module <<'JS'
import assert from 'node:assert/strict'
import config from './astro.config.mjs'

assert.equal(config.output, 'static', 'Walletbeat requires static Astro output.')
JS
