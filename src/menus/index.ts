import { input } from "@inquirer/prompts";
import type { MainMenuAction, OutputFormat } from "./types.js";
import { clearScreen, getFrameWidth, frameMessage } from "./utils.js";
import { inquirerTheme } from "./colors.js";
import { promptFramedSelect } from "./framed-select.js";

export { promptFramedSelect } from "./framed-select.js";

const FRAMED_HINT = " ↑/↓ move  Enter select  Esc back";

export async function promptMainMenu(): Promise<MainMenuAction> {
  clearScreen();
  const value = await promptFramedSelect(
    "What do you want to do?",
    [
      { name: "Convert an EPUB file", value: "convert" },
      { name: "Settings", value: "settings" },
      { name: "Exit", value: "exit" },
    ],
    " ↑/↓ move  Enter select  Esc exit"
  );
  return (value ?? "exit") as MainMenuAction;
}

function outputFormatDefaultIndex(f: OutputFormat): number {
  switch (f) {
    case "txt":
      return 0;
    case "md":
      return 1;
    case "json":
      return 2;
    case "html":
      return 3;
    default:
      return 0;
  }
}

export async function promptOutputFormat(
  defaultFormat: OutputFormat
): Promise<OutputFormat> {
  clearScreen();
  const value = await promptFramedSelect(
    "Output format",
    [
      { name: "Plain text (.txt)", value: "txt" },
      { name: "Markdown (.md)", value: "md" },
      { name: "JSON (.json)", value: "json" },
      { name: "HTML (.html)", value: "html" },
    ],
    FRAMED_HINT,
    outputFormatDefaultIndex(defaultFormat)
  );
  return (value ?? "txt") as OutputFormat;
}

export interface SuccessScreenResult {
  outputDir: string;
  totalChapters: number;
}

const SUCCESS_QUOTES = [
  "🎉  Done! Your future self will thank you.",
  "🎉  Another one for the digital shelf.",
  "🎉  Extraction complete. No books were harmed.",
  "🎉  Done! Time for a reading break?",
  "🎉  Your ebook is now in a more portable format.",
  "🎉  All done! Happy reading.",
  "🎉  Successfully extracted. Enjoy!",
  "🎉  Conversion complete. You're all set.",
  "🎉  Done! May your reading be smooth.",
  "🎉  Extracted and ready. Nice work.",
  "🎉  That's a wrap. Happy reading!",
];

function pickSuccessQuote(): string {
  return SUCCESS_QUOTES[Math.floor(Math.random() * SUCCESS_QUOTES.length)]!;
}

function buildSuccessContentLines(result: SuccessScreenResult): string[] {
  const maxPath = Math.max(20, getFrameWidth() - 6);
  const pathDisplay =
    result.outputDir.length <= maxPath
      ? result.outputDir
      : "…" + result.outputDir.slice(-maxPath + 1);
  return [
    "",
    "📚  Your book has been successfully converted.",
    "",
    `  ${pathDisplay}`,
    `  ${result.totalChapters} chapter${result.totalChapters === 1 ? "" : "s"} extracted`,
    "",
    pickSuccessQuote(),
  ];
}

export async function promptSuccessScreen(
  result: SuccessScreenResult
): Promise<void> {
  clearScreen();
  await promptFramedSelect(
    "✅  Success!",
    [{ name: "▶  Continue", value: "continue" }],
    " Enter to continue",
    0,
    buildSuccessContentLines(result)
  );
}

export async function promptChangeSettingsBeforeConverting(): Promise<boolean> {
  clearScreen();
  const value = await promptFramedSelect(
    "Change settings before converting?",
    [
      { name: "No, use current settings", value: "no" },
      { name: "Yes, open settings", value: "yes" },
    ],
    " ↑/↓ move  Enter select  Esc back",
    0
  );
  return value === "yes";
}

export async function promptOutputFilename(
  defaultName?: string
): Promise<string> {
  clearScreen();
  const name = await input({
    message: frameMessage("Output file name (without extension)"),
    default: defaultName,
    theme: inquirerTheme,
    validate: (value) => {
      const trimmed = value.trim();
      if (trimmed.length === 0 && !defaultName)
        return "Please enter a non-empty name.";
      if (/[<>:"/\\|?*]/.test(trimmed))
        return 'Name must not contain <>:"/\\|?*';
      return true;
    },
  });
  const trimmed = name.trim();
  return trimmed || defaultName || "";
}
