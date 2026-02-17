import { input } from "@inquirer/prompts";
import type {
  MainMenuAction,
  OutputFormat,
  AfterFileSelectionAction,
} from "./types.js";
import { clearScreen, getFrameWidth, frameMessage } from "./utils.js";
import { inquirerTheme } from "./colors.js";
import {
  promptFramedSelect,
  promptScrollableContent,
} from "./framed-select.js";
import { getConfigDir } from "../utils/config-dir.js";
import { t } from "../i18n/index.js";

export { promptFramedSelect } from "./framed-select.js";

function buildHowToContent(): string[] {
  const configDir = getConfigDir();
  const width = Math.min(getFrameWidth() - 6, 72);
  const wrap = (s: string): string =>
    s.length <= width ? s : s.slice(0, width - 1) + "…";
  return [
    ...t("howto_nav"),
    "",
    t("howto_where_header"),
    t("howto_config_prefix") + wrap(configDir),
    t("howto_output_line"),
  ];
}

export async function promptHowTo(): Promise<void> {
  clearScreen();
  await promptScrollableContent(
    t("howto_title"),
    () => buildHowToContent(),
    t("hint_scroll")
  );
}

export async function promptMainMenu(): Promise<MainMenuAction> {
  clearScreen();
  const value = await promptFramedSelect(
    t("menu_whatToDo"),
    [
      { name: t("menu_convert"), value: "convert" },
      { name: t("menu_settings"), value: "settings" },
      { name: t("menu_howto"), value: "howto" },
      { name: t("menu_exit"), value: "exit" },
    ],
    t("hint_exit")
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
    t("output_format"),
    [
      { name: t("format_txt"), value: "txt" },
      { name: t("format_md"), value: "md" },
      { name: t("format_json"), value: "json" },
      { name: t("format_html"), value: "html" },
    ],
    t("hint_moveSelect"),
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
  const chLabel = t("success_chapters");
  return [
    "",
    "📚  " + t("success_converted"),
    "",
    `  ${pathDisplay}`,
    `  ${result.totalChapters} ${chLabel}${result.totalChapters === 1 ? "" : "s"} extracted`,
    "",
    pickSuccessQuote(),
  ];
}

export async function promptSuccessScreen(
  result: SuccessScreenResult
): Promise<void> {
  clearScreen();
  await promptFramedSelect(
    t("success_title"),
    [{ name: t("continue"), value: "continue" }],
    " Enter to continue",
    0,
    buildSuccessContentLines(result)
  );
}

export async function promptAfterFileSelection(): Promise<AfterFileSelectionAction | null> {
  clearScreen();
  const value = await promptFramedSelect(
    t("menu_whatToDo"),
    [
      { name: t("extract_ebook"), value: "extract" },
      { name: t("select_formats"), value: "select_formats" },
      { name: t("change_settings"), value: "change_settings" },
      { name: t("view_selected"), value: "view_selected_files" },
      { name: t("back_to_list"), value: "back" },
      { name: t("back_to_menu"), value: "cancel" },
    ],
    t("hint_moveSelect"),
    0
  );
  return value as AfterFileSelectionAction | null;
}

export async function promptOutputFilename(
  defaultName?: string
): Promise<string> {
  clearScreen();
  const name = await input({
    message: frameMessage(t("output_filename")),
    default: defaultName,
    theme: inquirerTheme,
    validate: (value) => {
      const trimmed = value.trim();
      if (trimmed.length === 0 && !defaultName)
        return t("output_filename_error");
      if (/[<>:"/\\|?*]/.test(trimmed)) return t("output_filename_invalid");
      return true;
    },
  });
  const trimmed = name.trim();
  return trimmed || defaultName || "";
}
