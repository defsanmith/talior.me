#!/usr/bin/env node

const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const isWatch = process.argv.includes("--watch");

const sharedConfig = {
  bundle: true,
  platform: "browser",
  target: "chrome120",
  sourcemap: isWatch ? "inline" : false,
  minify: !isWatch,
};

const entryPoints = [
  { in: "src/content.ts", out: "content" },
  { in: "src/background.ts", out: "background" },
  { in: "src/popup.ts", out: "popup" },
];

function copyPublicFiles() {
  const distDir = path.join(__dirname, "dist");
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  // Copy popup.html
  fs.copyFileSync(
    path.join(__dirname, "public", "popup.html"),
    path.join(distDir, "popup.html")
  );

  // Copy manifest.json
  fs.copyFileSync(
    path.join(__dirname, "manifest.json"),
    path.join(distDir, "manifest.json")
  );

  // Copy icons
  const iconsDir = path.join(distDir, "icons");
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  const srcIconsDir = path.join(__dirname, "public", "icons");
  if (fs.existsSync(srcIconsDir)) {
    for (const file of fs.readdirSync(srcIconsDir)) {
      fs.copyFileSync(
        path.join(srcIconsDir, file),
        path.join(iconsDir, file)
      );
    }
  }

  console.log("✓ Copied public files to dist/");
}

async function build() {
  copyPublicFiles();

  if (isWatch) {
    const contexts = await Promise.all(
      entryPoints.map((ep) =>
        esbuild.context({
          ...sharedConfig,
          entryPoints: [ep.in],
          outfile: `dist/${ep.out}.js`,
        })
      )
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("👀 Watching for changes...");
  } else {
    await esbuild.build({
      ...sharedConfig,
      entryPoints: entryPoints.map((ep) => ep.in),
      outdir: "dist",
    });
    console.log("✓ Build complete → dist/");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
