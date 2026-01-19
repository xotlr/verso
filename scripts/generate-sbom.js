#!/usr/bin/env node
/**
 * SBOM Generator for Bun projects
 * Generates CycloneDX 1.5 JSON format from bun.lock
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = path.resolve(__dirname, "..");
const bunLockPath = path.join(projectRoot, "bun.lock");
const packageJsonPath = path.join(projectRoot, "package.json");
const outputPath = path.join(projectRoot, "sbom.json");

function generateBomRef(name, version) {
  return `pkg:npm/${encodeURIComponent(name)}@${version}`;
}

/**
 * Parse "name@version" format from bun.lock
 * Examples:
 *   "@babel/core@7.28.5" -> { name: "@babel/core", version: "7.28.5" }
 *   "react@19.2.3" -> { name: "react", version: "19.2.3" }
 */
function parseNameAtVersion(str) {
  const lastAtIndex = str.lastIndexOf("@");
  // For scoped packages like @babel/core, ensure we find the version @
  if (lastAtIndex <= 0) return null;
  // Check if this @ is after a / (scoped package) - we need the last @
  const name = str.substring(0, lastAtIndex);
  const version = str.substring(lastAtIndex + 1);
  if (!version || !name) return null;
  return { name, version };
}

/**
 * Parse bun.lock which uses relaxed JSON (trailing commas allowed)
 */
function parseBunLock(content) {
  // Remove trailing commas before ] and }
  const cleaned = content.replace(/,(\s*[\]}])/g, "$1");
  return JSON.parse(cleaned);
}

function main() {
  // Read input files
  const bunLockContent = fs.readFileSync(bunLockPath, "utf-8");
  const bunLock = parseBunLock(bunLockContent);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  // Collect all resolved packages from bun.lock
  // bun.lock format: "packageName": ["packageName@version", "", { deps }, "sha512-..."]
  const packages = bunLock.packages || {};
  const components = [];
  const seen = new Set();

  for (const [_key, value] of Object.entries(packages)) {
    // Skip if not an array (could be metadata)
    if (!Array.isArray(value)) continue;

    // First element is "name@version"
    const nameAtVersion = value[0];
    if (typeof nameAtVersion !== "string") continue;

    const parsed = parseNameAtVersion(nameAtVersion);
    if (!parsed) continue;

    const { name, version } = parsed;

    // Skip duplicates
    const uniqueKey = `${name}@${version}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    // Determine if it's a dev dependency
    const isDev =
      packageJson.devDependencies &&
      Object.keys(packageJson.devDependencies).includes(name);

    const component = {
      type: "library",
      "bom-ref": generateBomRef(name, version),
      name: name,
      version: version,
      purl: `pkg:npm/${encodeURIComponent(name)}@${version}`,
      scope: isDev ? "optional" : "required",
    };

    // Add integrity hash if available (last element of array)
    const lastElement = value[value.length - 1];
    if (typeof lastElement === "string" && lastElement.startsWith("sha512-")) {
      component.hashes = [
        {
          alg: "SHA-512",
          content: lastElement.replace("sha512-", ""),
        },
      ];
    }

    components.push(component);
  }

  // Sort components by name for consistency
  components.sort((a, b) => a.name.localeCompare(b.name));

  // Build CycloneDX SBOM
  const sbom = {
    $schema: "http://cyclonedx.org/schema/bom-1.5.schema.json",
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: "Verso",
          name: "generate-sbom",
          version: "1.0.0",
        },
      ],
      component: {
        type: "application",
        "bom-ref": generateBomRef(packageJson.name, packageJson.version),
        name: packageJson.name,
        version: packageJson.version,
      },
    },
    components: components,
  };

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));

  console.log(`Generated SBOM with ${components.length} components`);
  console.log(`Output: ${outputPath}`);
}

main();
