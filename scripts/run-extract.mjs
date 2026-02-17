import path from "node:path";
import * as lib from "../dist/lib.js";

function parseArgs(argv) {
  const format = argv[0];
  const rest = argv.slice(1);
  let sourcePath = null;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--flat") {
      opts.flatOutput = true;
    } else if (arg === "--include-images") {
      opts.includeImages = true;
    } else if (arg.startsWith("--output-path=")) {
      opts.outputPath = arg.slice("--output-path=".length);
    } else if (arg === "--output-path" && rest[i + 1]) {
      opts.outputPath = rest[++i];
    } else if (arg.startsWith("--output-name=")) {
      opts.outputName = arg.slice("--output-name=".length);
    } else if (arg === "--output-name" && rest[i + 1]) {
      opts.outputName = rest[++i];
    } else if (!arg.startsWith("--")) {
      sourcePath = arg;
    }
  }
  return { format, sourcePath, opts };
}

async function main() {
  const argv = process.argv.slice(2);
  const { format, sourcePath, opts } = parseArgs(argv);
  if (!format || !["txt", "md", "html", "json"].includes(format)) {
    console.error(
      "Usage: run-extract.mjs <txt|md|html|json> <source-path> [--output-path=DIR] [--output-name=NAME] [--flat] [--include-images]"
    );
    process.exit(1);
  }
  if (!sourcePath) {
    console.error("Missing source file path.");
    process.exit(1);
  }
  const resolvedSource = path.resolve(process.cwd(), sourcePath);
  const defaultOutputPath = path.dirname(resolvedSource);
  const defaultOutputName =
    path.basename(resolvedSource, path.extname(resolvedSource)) || "output";
  const input = {
    sourcePath: resolvedSource,
    outputPath: opts.outputPath
      ? path.resolve(process.cwd(), opts.outputPath)
      : defaultOutputPath,
    outputName: opts.outputName ?? defaultOutputName,
    flatOutput: opts.flatOutput === true,
    includeImages: opts.includeImages === true,
  };
  const fn = lib[`eXepub2${format}`];
  if (!fn) {
    console.error(`Unknown format: ${format}`);
    process.exit(1);
  }
  try {
    const result = await fn(input);
    const out = Array.isArray(result) ? result[0] : result;
    if (out?.outputPath) {
      console.log("Output:", out.outputPath);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
