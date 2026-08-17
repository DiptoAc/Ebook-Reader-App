import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = path.join(root, "tmp", "capacitor-static-build");
const outputDirectory = path.join(root, "out");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const apiDirectory = path.join(root, "app", "api");

function copyBuildSource(sourceName) {
  const source = path.join(root, sourceName);
  const destination = path.join(buildRoot, sourceName);
  fs.cpSync(source, destination, {
    recursive: true,
    filter: (entry) => path.resolve(entry) !== apiDirectory,
  });
}

// Build in a temporary copy so a running `next dev` server never has to release
// app/api on Windows. Only browser source, public assets and book-content.js are copied.
fs.rmSync(buildRoot, { recursive: true, force: true });
fs.mkdirSync(buildRoot, { recursive: true });

try {
  copyBuildSource("app");
  copyBuildSource("lib");
  copyBuildSource("public");
  fs.copyFileSync(path.join(root, "package.json"), path.join(buildRoot, "package.json"));
  fs.copyFileSync(path.join(root, "next.config.mjs"), path.join(buildRoot, "next.config.mjs"));

  execFileSync(process.execPath, [nextBin, "build"], {
    cwd: buildRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      CAPACITOR_BUILD: "true",
      // This is a public URL, not an API key. The API key stays on Netlify.
      NEXT_PUBLIC_AI_API_URL: process.env.ANDROID_AI_API_URL ?? "https://koilas.netlify.app/api/ask",
    },
  });

  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.renameSync(path.join(buildRoot, "out"), outputDirectory);
} finally {
  fs.rmSync(buildRoot, { recursive: true, force: true });
}
