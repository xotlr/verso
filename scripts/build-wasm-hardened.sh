#!/bin/bash
set -e

WASM_FILE="../public/wasm/verso_pagination_engine_bg.wasm"
cd verso-engine

# Check if pre-built WASM exists
if [ -f "$WASM_FILE" ]; then
  echo "Pre-built WASM found: $(du -h $WASM_FILE | cut -f1)"

  # In CI without Rust toolchain, use pre-built
  if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not available, using pre-built WASM"
    exit 0
  fi

  # In CI/production without wasm-opt, use pre-built (it was already optimized)
  if [ "$CI" = "true" ] || [ "$VERCEL" = "1" ] || [ "$NODE_ENV" = "production" ]; then
    if ! command -v wasm-opt &> /dev/null; then
      echo "wasm-opt not available in CI, using pre-built WASM"
      exit 0
    fi
  fi
fi

# If we get here, we have the tools to build
if ! command -v wasm-pack &> /dev/null; then
  echo "ERROR: wasm-pack is required to build WASM"
  echo "Install with: cargo install wasm-pack"
  echo "Or commit a pre-built WASM to public/wasm/"
  exit 1
fi

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
  echo "wasm-opt not found, skipping additional hardening"
  echo "For production builds, install with: cargo install wasm-opt"
fi
