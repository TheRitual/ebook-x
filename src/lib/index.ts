import path from "node:path";
import fs from "node:fs";
import { convertEpub } from "../converter/index.js";
import { buildConvertOptions } from "./utils/build-convert-options.js";
import type { ExtractOptions, ExtractResult } from "./types.js";

function ensureOutputDir(dir: string): string {
  const resolved = path.resolve(dir);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

async function runOne(
  input: ExtractOptions,
  format: "txt" | "md" | "html" | "json"
): Promise<ExtractResult> {
  const outputDir = ensureOutputDir(input.outputPath);
  const options = buildConvertOptions(input, format);
  const flatOutput = input.flatOutput === true;
  return convertEpub(
    input.sourcePath,
    input.outputName,
    format,
    options,
    outputDir,
    undefined,
    flatOutput
  );
}

function normalizeInput(
  input: ExtractOptions | ExtractOptions[]
): ExtractOptions[] {
  return Array.isArray(input) ? input : [input];
}

export async function eXepub2txt(
  input: ExtractOptions | ExtractOptions[]
): Promise<ExtractResult | ExtractResult[]> {
  const items = normalizeInput(input);
  const results = await Promise.all(items.map((opts) => runOne(opts, "txt")));
  return items.length === 1 ? results[0]! : results;
}

export async function eXepub2md(
  input: ExtractOptions | ExtractOptions[]
): Promise<ExtractResult | ExtractResult[]> {
  const items = normalizeInput(input);
  const results = await Promise.all(items.map((opts) => runOne(opts, "md")));
  return items.length === 1 ? results[0]! : results;
}

export async function eXepub2html(
  input: ExtractOptions | ExtractOptions[]
): Promise<ExtractResult | ExtractResult[]> {
  const items = normalizeInput(input);
  const results = await Promise.all(items.map((opts) => runOne(opts, "html")));
  return items.length === 1 ? results[0]! : results;
}

export async function eXepub2json(
  input: ExtractOptions | ExtractOptions[]
): Promise<ExtractResult | ExtractResult[]> {
  const items = normalizeInput(input);
  const results = await Promise.all(items.map((opts) => runOne(opts, "json")));
  return items.length === 1 ? results[0]! : results;
}

export type { ExtractOptions, ExtractResult } from "./types.js";
