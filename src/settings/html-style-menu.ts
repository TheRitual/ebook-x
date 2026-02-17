import type { AppSettings } from "./types.js";
import {
  BUILT_IN_HTML_STYLE_ID,
  BUILT_IN_HTML_STYLE_IDS,
  isBuiltInHtmlStyleId,
  getBuiltInHtmlStyle,
  listCustomHtmlStyleIds,
  loadCustomHtmlStyle,
  loadHtmlStyle,
  saveCustomHtmlStyle,
  deleteCustomHtmlStyle,
} from "../html-styles/index.js";
import { promptFramedSelect } from "../menus/framed-select.js";
import { input } from "@inquirer/prompts";
import { inquirerTheme } from "../menus/colors.js";
import { promptEditStyleClasses } from "./html-style-editor.js";

const MENU_HINT = " ↑/↓ move  Enter select  Esc back";

export type ManageHtmlStylesAction =
  | { type: "back" }
  | { type: "deletedCurrent"; newId: string };

function getHtmlStyleDisplayName(id: string): string {
  if (isBuiltInHtmlStyleId(id)) {
    const def = getBuiltInHtmlStyle(id);
    return `${def.name} (built-in)`;
  }
  const custom = loadCustomHtmlStyle(id);
  return custom ? `${custom.name} (custom)` : id;
}

export async function promptChooseHtmlStyle(
  currentId: string
): Promise<string | null> {
  const custom = listCustomHtmlStyleIds();
  const choices = [
    ...BUILT_IN_HTML_STYLE_IDS.map((id) => ({
      name: getHtmlStyleDisplayName(id),
      value: id,
    })),
    ...custom.map((id) => ({ name: getHtmlStyleDisplayName(id), value: id })),
  ];
  const value = await promptFramedSelect(
    "Choose HTML style",
    choices,
    MENU_HINT,
    choices.findIndex((c) => c.value === currentId)
  );
  return value;
}

export async function promptManageHtmlStyles(
  settings: AppSettings
): Promise<ManageHtmlStylesAction> {
  const custom = listCustomHtmlStyleIds();
  const choices = [
    { name: "Add style (copy from existing)", value: "add" },
    ...(custom.length > 0
      ? [
          { name: "Edit style", value: "edit" },
          { name: "Delete style", value: "delete" },
        ]
      : []),
    { name: "Back", value: "back" },
  ].filter((c): c is { name: string; value: string } => "value" in c);

  const value = await promptFramedSelect(
    "Manage HTML styles",
    choices,
    MENU_HINT
  );

  if (value === null || value === "back") return { type: "back" };
  if (value === "add") {
    await promptAddHtmlStyle();
    return { type: "back" };
  }
  if (value === "edit") {
    const id = await promptPickStyleToEdit();
    if (id !== null) await runEditHtmlStyle(id);
    return { type: "back" };
  }
  if (value === "delete") {
    const id = await promptPickStyleToDelete();
    if (id !== null) {
      const currentId =
        settings.formats.html.htmlStyleId ?? BUILT_IN_HTML_STYLE_ID;
      deleteCustomHtmlStyle(id);
      if (id === currentId)
        return { type: "deletedCurrent", newId: BUILT_IN_HTML_STYLE_ID };
    }
    return { type: "back" };
  }
  return { type: "back" };
}

async function promptPickStyleToEdit(): Promise<string | null> {
  const custom = listCustomHtmlStyleIds();
  if (custom.length === 0) return null;
  const choices = custom.map((id) => ({
    name: getHtmlStyleDisplayName(id),
    value: id,
  }));
  return promptFramedSelect("Edit which style?", choices, MENU_HINT);
}

async function promptPickStyleToDelete(): Promise<string | null> {
  const custom = listCustomHtmlStyleIds();
  if (custom.length === 0) return null;
  const choices = custom.map((id) => ({
    name: getHtmlStyleDisplayName(id),
    value: id,
  }));
  return promptFramedSelect("Delete which style?", choices, MENU_HINT);
}

async function promptAddHtmlStyle(): Promise<string | null> {
  const custom = listCustomHtmlStyleIds();
  const choices = [
    ...BUILT_IN_HTML_STYLE_IDS.map((id) => ({
      name: getHtmlStyleDisplayName(id),
      value: id,
    })),
    ...custom.map((id) => ({ name: getHtmlStyleDisplayName(id), value: id })),
  ];
  const baseValue = await promptFramedSelect(
    "Base style for new style",
    choices,
    MENU_HINT
  );
  if (baseValue === null) return null;
  const baseStyle = loadHtmlStyle(baseValue);
  if (!baseStyle) return null;
  const name = await input({
    message: "New style name (used as filename)",
    default: baseStyle.name + " (copy)",
    theme: inquirerTheme,
    validate: (v) => {
      const t = v.trim();
      if (!t) return "Name cannot be empty.";
      if (/[<>:"/\\|?*]/.test(t)) return 'Name must not contain <>:"/\\|?*';
      return true;
    },
  });
  const id = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
  if (!id) return null;
  const newStyle = {
    name: name.trim(),
    classes: baseStyle.classes.map((c) => ({ ...c, rules: { ...c.rules } })),
  };
  saveCustomHtmlStyle(id, newStyle);
  return id;
}

type EditResult =
  | { type: "chosen"; htmlStyleId: string }
  | { type: "saved"; htmlStyleId: string }
  | null;

async function runEditHtmlStyle(currentId: string): Promise<EditResult | null> {
  const isBuiltIn = isBuiltInHtmlStyleId(currentId);
  const style = loadHtmlStyle(currentId);
  if (!style) return null;

  const edited = await promptEditStyleClasses(style);
  if (!edited) return null;

  if (isBuiltIn) {
    const newId = await promptNewStyleId(edited.name);
    if (newId === null) return null;
    saveCustomHtmlStyle(newId, edited);
    return { type: "chosen", htmlStyleId: newId };
  }

  const action = await promptSaveOrSaveAsHtmlStyle();
  if (action === "cancel") return null;
  if (action === "save") {
    saveCustomHtmlStyle(currentId, edited);
    return { type: "saved", htmlStyleId: currentId };
  }
  const newId = await promptNewStyleId(edited.name);
  if (newId === null) return null;
  saveCustomHtmlStyle(newId, edited);
  return { type: "chosen", htmlStyleId: newId };
}

async function promptSaveOrSaveAsHtmlStyle(): Promise<
  "save" | "saveAs" | "cancel"
> {
  const value = await promptFramedSelect(
    "Save style",
    [
      { name: "Save (overwrite current)", value: "save" },
      { name: "Save as (new copy)", value: "saveAs" },
      { name: "Cancel", value: "cancel" },
    ],
    MENU_HINT,
    0
  );
  return (value as "save" | "saveAs" | "cancel") ?? "cancel";
}

async function promptNewStyleId(defaultName: string): Promise<string | null> {
  const name = await input({
    message: "Style id (filename, e.g. my-style)",
    default: defaultName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, ""),
    theme: inquirerTheme,
    validate: (v) => {
      const t = v.trim();
      if (!t) return "Id cannot be empty.";
      if (/[<>:"/\\|?*]/.test(t)) return 'Id must not contain <>:"/\\|?*';
      return true;
    },
  });
  const id = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
  return id || null;
}
