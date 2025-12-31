/**
 * Generate integrity hashes for critical assets at build time.
 * These hashes are verified at runtime to detect tampering.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSRI(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${filePath} not found, skipping`);
    return null;
  }
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha384').update(content).digest('base64');
  return `sha384-${hash}`;
}

const publicDir = path.join(__dirname, '..', 'public');

const assets = {
  wasm: generateSRI(path.join(publicDir, 'wasm', 'verso_pagination_engine_bg.wasm')),
  generatedAt: new Date().toISOString(),
};

// Filter out null values
const validAssets = Object.fromEntries(
  Object.entries(assets).filter(([, v]) => v !== null)
);

const outputPath = path.join(publicDir, 'integrity.json');
fs.writeFileSync(outputPath, JSON.stringify(validAssets, null, 2));

console.log('Generated integrity hashes:');
console.log(`  WASM: ${validAssets.wasm || 'not found'}`);
console.log(`  Output: ${outputPath}`);
