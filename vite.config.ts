import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        cli: "src/cli.ts",
        lib: "src/lib/index.ts",
      },
      output: {
        entryFileNames: "[name].js",
        format: "es",
      },
    },
    minify: false,
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
