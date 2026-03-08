import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
  shims: false,
  splitting: false,
});
