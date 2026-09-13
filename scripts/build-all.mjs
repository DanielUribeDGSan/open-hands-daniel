#!/usr/bin/env node
import { execSync } from "node:child_process";
import { rmSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const distElectron = join(root, "dist-electron");
const releaseFinal = join(root, "release-final");

function run(cmd, env = {}) {
  console.log(`\n\x1b[36m> ${cmd}\x1b[0m\n`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function cleanAndCopy(targetName) {
  const targetDir = join(releaseFinal, targetName);
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  const releaseExtensions = [".dmg", ".zip", ".exe", ".yml", ".blockmap"];
  const files = readdirSync(distElectron).filter(
    (file) =>
      releaseExtensions.some((ext) => file.endsWith(ext)) &&
      !file.startsWith("builder-"),
  );

  for (const file of files) {
    copyFileSync(join(distElectron, file), join(targetDir, file));
  }
}

try {
  rmSync(releaseFinal, { recursive: true, force: true });
  mkdirSync(releaseFinal, { recursive: true });

  console.log("\n\x1b[33m--- BUILD FRONTEND ---\x1b[0m");
  run("npm run build:app");

  // 1. Mac ARM64
  console.log("\n\x1b[33m--- BUILD MAC ARM64 (CHIP M) ---\x1b[0m");
  rmSync(distElectron, { recursive: true, force: true });
  run("node scripts/download-uv.mjs", {
    TARGET_PLATFORM: "darwin",
    TARGET_ARCH: "arm64",
  });
  run("node scripts/download-node.mjs", {
    TARGET_PLATFORM: "darwin",
    TARGET_ARCH: "arm64",
  });
  run(
    "npx electron-builder --config electron-builder.config.mjs --publish never --mac",
    { ELECTRON_ARCH: "arm64" },
  );
  cleanAndCopy("mac-arm64");

  // 2. Mac Intel (x64)
  console.log("\n\x1b[33m--- BUILD MAC INTEL (X64) ---\x1b[0m");
  rmSync(distElectron, { recursive: true, force: true });
  run("node scripts/download-uv.mjs", {
    TARGET_PLATFORM: "darwin",
    TARGET_ARCH: "x64",
  });
  run("node scripts/download-node.mjs", {
    TARGET_PLATFORM: "darwin",
    TARGET_ARCH: "x64",
  });
  run(
    "npx electron-builder --config electron-builder.config.mjs --publish never --mac",
    { ELECTRON_ARCH: "x64" },
  );
  cleanAndCopy("mac-x64");

  // 3. Windows x64
  console.log("\n\x1b[33m--- BUILD WINDOWS (X64) ---\x1b[0m");
  rmSync(distElectron, { recursive: true, force: true });
  run("node scripts/download-uv.mjs", {
    TARGET_PLATFORM: "win32",
    TARGET_ARCH: "x64",
  });
  run("node scripts/download-node.mjs", {
    TARGET_PLATFORM: "win32",
    TARGET_ARCH: "x64",
  });
  run(
    "npx electron-builder --config electron-builder.config.mjs --publish never --win",
    { ELECTRON_ARCH: "x64" },
  );
  cleanAndCopy("windows-x64");

  console.log(
    "\n\x1b[32m✔ Todas las compilaciones se generaron exitosamente en la carpeta 'release-final'\x1b[0m\n",
  );
} catch (error) {
  console.error("\n\x1b[31m✖ Error en la compilación.\x1b[0m\n");
  process.exit(1);
}
