import type {
  HtmlStyleDefinition,
  HtmlStyleClassRule,
} from "../html-styles/types.js";
import {
  validateCssPropertyName,
  validateCssPropertyValue,
} from "../html-styles/utils/validate-css.js";
import { promptFramedSelect } from "../menus/framed-select.js";
import { input } from "@inquirer/prompts";
import { inquirerTheme } from "../menus/colors.js";

const HINT = " ↑/↓ j/k move  Enter edit  a add  d remove  Esc back";

export async function promptEditClassRules(
  label: string,
  rule: HtmlStyleClassRule
): Promise<HtmlStyleClassRule | null> {
  const edited: HtmlStyleClassRule = {
    class: rule.class,
    label: rule.label,
    rules: { ...rule.rules },
  };
  const entries = (): { key: string; value: string }[] =>
    Object.entries(edited.rules).map(([key, value]) => ({ key, value }));

  for (;;) {
    const list = entries();
    const choices: { name: string; value: string }[] = [
      { name: "+ Add property", value: "__add__" },
      ...list.map((e) => ({ name: `  ${e.key}: ${e.value}`, value: e.key })),
      { name: "Done", value: "__done__" },
    ];

    const value = await promptFramedSelect(
      `Edit class: ${label}`,
      choices,
      HINT,
      list.length > 0 ? 1 : 0
    );

    if (value === null) return null;
    if (value === "__done__") return edited;
    if (value === "__add__") {
      const keyRaw = await input({
        message: "CSS property name",
        theme: inquirerTheme,
        validate: (v) => {
          const r = validateCssPropertyName(v.trim());
          return r.ok ? true : r.error;
        },
      });
      const key = keyRaw.trim();
      if (edited.rules[key]) continue;
      const valueRaw = await input({
        message: "CSS property value",
        theme: inquirerTheme,
        validate: (v) => {
          const r = validateCssPropertyValue(v);
          return r.ok ? true : r.error;
        },
      });
      edited.rules[key] = valueRaw;
      continue;
    }

    const key = value;
    const subValue = await promptFramedSelect(
      `Property: ${key}`,
      [
        { name: "Edit key", value: "key" },
        { name: "Edit value", value: "value" },
        { name: "Remove", value: "remove" },
      ],
      HINT,
      0
    );
    if (subValue === null) continue;
    if (subValue === "remove") {
      delete edited.rules[key];
      continue;
    }
    if (subValue === "key") {
      const newKeyRaw = await input({
        message: "New property name",
        default: key,
        theme: inquirerTheme,
        validate: (v) => {
          const r = validateCssPropertyName(v.trim());
          return r.ok ? true : r.error;
        },
      });
      const newKey = newKeyRaw.trim();
      if (newKey !== key && !edited.rules[newKey]) {
        edited.rules[newKey] = edited.rules[key]!;
        delete edited.rules[key];
      }
      continue;
    }
    if (subValue === "value") {
      const newValue = await input({
        message: "New value",
        default: edited.rules[key],
        theme: inquirerTheme,
        validate: (v) => {
          const r = validateCssPropertyValue(v);
          return r.ok ? true : r.error;
        },
      });
      edited.rules[key] = newValue;
    }
  }
}

export async function promptEditStyleClasses(
  style: HtmlStyleDefinition
): Promise<HtmlStyleDefinition | null> {
  const edited: HtmlStyleDefinition = {
    name: style.name,
    classes: style.classes.map((c) => ({ ...c, rules: { ...c.rules } })),
  };

  for (;;) {
    const choices = edited.classes.map((cls) => ({
      name: cls.label,
      value: cls.class,
    }));
    const value = await promptFramedSelect(
      `Edit style: ${edited.name}`,
      [...choices, { name: "Done", value: "__done__" }],
      HINT,
      0
    );

    if (value === null) return null;
    if (value === "__done__") return edited;

    const cls = edited.classes.find((c) => c.class === value);
    if (!cls) continue;
    const updated = await promptEditClassRules(cls.label, cls);
    if (updated) {
      const idx = edited.classes.findIndex((c) => c.class === value);
      if (idx !== -1) edited.classes[idx] = updated;
    }
  }
}
