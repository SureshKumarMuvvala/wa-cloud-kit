#!/bin/sh
# Called by changesets/action only when there are no pending changesets,
# i.e. when the Version Packages PR has been merged. Opening/updating that
# PR never reaches this script, so it works without the token.
if [ -z "$NODE_AUTH_TOKEN" ]; then
  echo "::error title=NPM_TOKEN missing::Add the NPM_TOKEN repository secret, then re-run."
  exit 1
fi
exec pnpm exec changeset publish
