#!/usr/bin/env bash
# Offline link check of the built site in public/.
#
# Covers internal links, images and #anchor fragments. External links are left
# out on purpose: they fail for reasons that have nothing to do with the commit
# at hand (rate limits, bot walls, flaky hosts), so they must not gate a deploy.
#
# Build the site with hugo first. Used by .github/workflows/links.yml and by the
# Netlify build commands in netlify.toml.
set -euo pipefail

LYCHEE_VERSION=0.24.2

repo_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_root"

if [ ! -d public ]; then
  echo "public/ is missing, build the site with hugo first" >&2
  exit 1
fi

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)  asset=lychee-x86_64-unknown-linux-musl ;;
  Linux-aarch64) asset=lychee-aarch64-unknown-linux-musl ;;
  Darwin-arm64)  asset=lychee-aarch64-apple-darwin ;;
  Darwin-x86_64) asset=lychee-x86_64-apple-darwin ;;
  *) echo "no lychee release build for $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

bin_dir="${TMPDIR:-/tmp}/lychee-$LYCHEE_VERSION-$asset"
lychee="$bin_dir/lychee"

if [ ! -x "$lychee" ]; then
  url="https://github.com/lycheeverse/lychee/releases/download/lychee-v$LYCHEE_VERSION/$asset.tar.gz"
  mkdir -p "$bin_dir"
  curl -sSfL -o "$bin_dir/$asset.tar.gz" "$url"
  curl -sSfL -o "$bin_dir/$asset.tar.gz.sha256" "$url.sha256"
  # Catches a truncated download. Not a security check, the checksum ships from
  # the same place as the archive.
  if command -v sha256sum >/dev/null; then
    (cd "$bin_dir" && sha256sum -c "$asset.tar.gz.sha256")
  else
    (cd "$bin_dir" && shasum -a 256 -c "$asset.tar.gz.sha256")
  fi
  tar xzf "$bin_dir/$asset.tar.gz" -C "$bin_dir" --strip-components=1 "$asset/lychee"
fi

# --root-dir resolves site absolute links such as /posts/foo/ against public/.
# --index-files makes a link to a directory pass only if the directory holds an
# index.html: lychee otherwise accepts any existing directory, while Netlify
# serves a 404 for one with no index file.
# The glob is quoted so lychee expands it and recurses, not the shell.
exec "$lychee" \
  --offline \
  --include-fragments \
  --no-progress \
  --index-files index.html \
  --root-dir "$repo_root/public" \
  "public/**/*.html"
