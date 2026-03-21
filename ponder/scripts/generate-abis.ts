#!/usr/bin/env tsx
/**
 * Generates ponder ABI TypeScript files from JSON ABI files.
 *
 * For each JSON file in abis/json/, it produces a kebab-case .ts file in abis/
 * with an inline `as const` array containing only the ABI entries relevant to ponder
 * (events by default, configurable via --all flag to include everything).
 *
 * Usage:
 *   pnpm tsx scripts/generate-abis.ts           # events only
 *   pnpm tsx scripts/generate-abis.ts --all     # all ABI entries
 *   pnpm tsx scripts/generate-abis.ts Bank      # specific contracts only
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ABIS_JSON_DIR = join(__dirname, "../abis/json");
const ABIS_OUT_DIR = join(__dirname, "../abis");

// Contracts to skip (utilities, mocks, OZ base contracts, etc.)
const SKIP_LIST = new Set([
  "AdCampaignManager",
  "TokenSupport",
  "ElectionUtils",
  "ProposalUtils",
  "MockBoardOfDirectors",
  "MockOfficer",
  "MockERC20",
  "Beacon",
  "BeaconProxy",
  "ERC1967Proxy",
  "ERC1967Utils",
  "ERC20",
  "ERC20Upgradeable",
  "ERC165Upgradeable",
  "EIP712Upgradeable",
  "ECDSA",
  "SafeCast",
  "SafeERC20",
  "Address",
  "Strings",
  "Errors",
  "Proxy",
  "ProxyAdmin",
  "TransparentUpgradeableProxy",
  "UserBeaconProxy",
  "UpgradeableBeacon",
  "Initializable",
  "Ownable",
  "OwnableUpgradeable",
  "ContextUpgradeable",
  "AccessControlUpgradeable",
  "Pausable",
  "PausableUpgradeable",
  "ReentrancyGuard",
  "ReentrancyGuardUpgradeable",
  "Tips",
  "Voting",
  "Vesting",
  "FeeCollector",
]);

function toKebabCase(name: string): string {
  // Handle sequences of uppercase letters (acronyms like EIP712) as a single token
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function toScreamingSnakeCase(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

function formatValue(val: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (val === null) return "null";
  if (typeof val === "boolean") return String(val);
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return JSON.stringify(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    const items = val.map((v) => `${pad}  ${formatValue(v, indent + 1)}`).join(",\n");
    return `[\n${items},\n${pad}]`;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const lines = entries
      .map(([k, v]) => `${pad}  ${k}: ${formatValue(v, indent + 1)}`)
      .join(",\n");
    return `{\n${lines},\n${pad}}`;
  }
  return String(val);
}

function generateFile(contractName: string, abi: unknown[], eventsOnly: boolean): string {
  const exportName = `${toScreamingSnakeCase(contractName)}_ABI`;
  const entries = eventsOnly ? abi.filter((e: any) => e.type === "event") : abi;

  const items = entries
    .map((entry) => `  ${formatValue(entry, 1)}`)
    .join(",\n");

  return `export const ${exportName} = [\n${items},\n] as const\n`;
}

// Parse args
const args = process.argv.slice(2);
const eventsOnly = !args.includes("--all");
const filterContracts = args.filter((a) => !a.startsWith("--"));

if (!existsSync(ABIS_JSON_DIR)) {
  console.error(
    `Error: ${ABIS_JSON_DIR} does not exist.\nRun 'npx hardhat compile' in the contract/ directory first.`
  );
  process.exit(1);
}

const jsonFiles = readdirSync(ABIS_JSON_DIR).filter((f) => f.endsWith(".json"));

let generated = 0;
let skipped = 0;

for (const file of jsonFiles) {
  const contractName = basename(file, ".json");

  if (SKIP_LIST.has(contractName)) {
    skipped++;
    continue;
  }

  if (filterContracts.length > 0 && !filterContracts.includes(contractName)) {
    continue;
  }

  const abi = JSON.parse(readFileSync(join(ABIS_JSON_DIR, file), "utf8"));
  const entries = eventsOnly ? abi.filter((e: any) => e.type === "event") : abi;

  if (entries.length === 0) {
    console.log(`  skip  ${contractName} (no ${eventsOnly ? "events" : "entries"})`);
    continue;
  }

  const outFile = join(ABIS_OUT_DIR, `${toKebabCase(contractName)}.ts`);
  const content = generateFile(contractName, abi, eventsOnly);
  writeFileSync(outFile, content);
  console.log(`  wrote ${outFile}`);
  generated++;
}

console.log(`\nDone: ${generated} files generated, ${skipped} skipped.`);
