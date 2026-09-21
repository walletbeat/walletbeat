#!/bin/bash

set -euo pipefail

# Checks that every external URL linked from the built HTML is in the
# known-valid URL set (tests/utils/known-urls.json). Logic lives in the
# tsx script next to this file; it reads DIST_DIR from the environment.
cd "$REPO_DIR"
exec pnpm exec tsx tests/postbuild/external_urls_test.ts
