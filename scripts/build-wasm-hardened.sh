#!/bin/bash
set -e

# In CI or production builds, require wasm-opt
if [ "$CI" = "true" ] || [ "$VERCEL" = "1" ] || [ "$NODE_ENV" = "production" ]; then
  if ! command -v wasm-opt &> /dev/null; then
    echo "ERROR: wasm-opt is required for production builds"
    echo "Install with: cargo install wasm-opt"
    exit 1
  fi
fi

cd verso-engine

echo "Building WASM with release optimizations..."
wasm-pack build --target web --release --out-dir ../public/wasm

# Apply wasm-opt hardening if available
if command -v wasm-opt &> /dev/null; then
  echo "Hardening WASM binary with wasm-opt..."
  wasm-opt -Oz --strip-debug --strip-producers \
    ../public/wasm/verso_pagination_engine_bg.wasm \
    -o ../public/wasm/verso_pagination_engine_bg.wasm
  echo "WASM hardened: $(du -h ../public/wasm/verso_pagination_engine_bg.wasm | cut -f1)"
else
  echo "wasm-opt not found, skipping additional hardening (dev mode)"
  echo "Install with: cargo install wasm-opt"
fi
