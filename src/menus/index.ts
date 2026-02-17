import { select, input, confirm } from "@inquirer/prompts";
import type { MainMenuAction, OutputFormat } from "./types.js";
import type {
  ConvertOptions,
  ChapterTitleStyleTxt,
} from "../converter/types.js";

export async function promptMainMenu(): Promise<MainMenuAction> {
  const action = await select<MainMenuAction>({
    message: "What do you want to do?",
    choices: [
      { name: "Convert an EPUB file", value: "convert" },
      { name: "Exit", value: "exit" },
    ],
  });
  return action;
}

export async function promptOutputFormat(): Promise<OutputFormat> {
  const format = await select<OutputFormat>({
    message: "Output format",
    choices: [
      { name: "Plain text (.txt)", value: "txt" },
      { name: "Markdown (.md)", value: "md" },
    ],
  });
  return format;
}

export async function promptConvertOptions(
  format: OutputFormat
): Promise<ConvertOptions> {
  const includeImages =
    format === "md"
      ? await confirm({
          message: "Extract and include images in output?",
          default: false,
        })
      : false;

  const addChapterTitles = await confirm({
    message: "Add chapter titles (e.g. Rozdział N) to the extracted text?",
    default: true,
  });

  let chapterTitleStyleTxt: ChapterTitleStyleTxt = "separated";
  if (addChapterTitles && format === "txt") {
    const style = await select<ChapterTitleStyleTxt>({
      message: "Chapter title style in .txt",
      choices: [
        {
          name: "Separated lines (Rozdział N on one line, title on next)",
          value: "separated",
        },
        {
          name: "Inline (Rozdział N - Title)",
          value: "inline",
        },
      ],
    });
    chapterTitleStyleTxt = style;
  }

  const emDashToHyphen = await confirm({
    message: "Replace em dash (—) with hyphen (-)?",
    default: true,
  });

  const sanitizeWhitespace = await confirm({
    message: "Sanitize all whitespace to spaces and newlines?",
    default: true,
  });

  const keepToc = await confirm({
    message: "Keep table of contents in the extracted text?",
    default: false,
  });

  const mdTocForChapters =
    format === "md"
      ? await confirm({
          message: "Create table of contents for the MD file (per chapter)?",
          default: false,
        })
      : false;

  return {
    includeImages,
    addChapterTitles,
    chapterTitleStyleTxt,
    emDashToHyphen,
    sanitizeWhitespace,
    keepToc,
    mdTocForChapters,
  };
}

export async function promptOutputFilename(): Promise<string> {
  const name = await input({
    message: "Output file name (without extension)",
    validate: (value) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return "Please enter a non-empty name.";
      if (/[<>:"/\\|?*]/.test(trimmed))
        return 'Name must not contain <>:"/\\|?*';
      return true;
    },
  });
  return name.trim();
}
