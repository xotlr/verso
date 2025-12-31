const { rmSync, readdirSync } = require('fs');
const { join } = require('path');

let removedCount = 0;

function removeSourceMaps(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        removeSourceMaps(fullPath);
      } else if (entry.name.endsWith('.map')) {
        rmSync(fullPath);
        removedCount++;
      }
    }
  } catch (e) {
    // Directory doesn't exist or not accessible
  }
}

console.log('Removing source maps from production build...');
removeSourceMaps('.next');
console.log(`Done. Removed ${removedCount} source map files.`);
