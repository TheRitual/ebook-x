const reset = "\x1b[0m";
const blue = "\x1b[34m";
const purple = "\x1b[35m";
const pink = "\x1b[95m";
const cyan = "\x1b[36m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";
const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const white = "\x1b[37m";
const brightWhite = "\x1b[97m";
const orange = "\x1b[38;5;208m";
const bgMagenta = "\x1b[45m";

export const theme = {
  reset,
  section: blue,
  sectionBold: blue + bold,
  selected: pink,
  selectedBg: bgMagenta,
  accent: purple,
  hint: cyan,
  dim,
  message: purple,
  blue,
  pink,
  purple,
  valueYes: green,
  valueNo: red,
  valueOther: yellow,
  bold,
  white,
  orange,
};

export function styleMessage(text: string): string {
  return theme.message + text + theme.reset;
}

export function styleSection(text: string): string {
  return theme.section + text + theme.reset;
}

export function styleSelected(text: string): string {
  return theme.selected + text + theme.reset;
}

export function styleHint(text: string): string {
  return theme.dim + theme.hint + text + theme.reset;
}

export function styleSelectedRow(text: string): string {
  return theme.selectedBg + brightWhite + bold + text + reset;
}

export function styleHintTips(text: string): string {
  const withoutPipe = text.replace(/\|/g, "").trim();
  const segments = withoutPipe.split(/\s{2,}/);
  const parts = segments.map((seg) => {
    const spaceIdx = seg.indexOf(" ");
    const key = spaceIdx === -1 ? seg : seg.slice(0, spaceIdx);
    const desc = spaceIdx === -1 ? "" : seg.slice(spaceIdx + 1);
    const keyStyled = theme.orange + key + theme.reset;
    const descStyled =
      desc === "" ? "" : theme.white + " " + desc + theme.reset;
    return keyStyled + descStyled;
  });
  return parts.join(theme.white + "  " + theme.reset);
}

export function styleSettingValue(value: string): string {
  const color =
    value === "Yes"
      ? theme.valueYes
      : value === "No"
        ? theme.valueNo
        : theme.valueOther;
  return color + theme.bold + value + theme.reset;
}

export function styleSettingLabel(name: string): string {
  const idx = name.lastIndexOf(": ");
  if (idx === -1) return name;
  const prefix = name.slice(0, idx + 2);
  const value = name.slice(idx + 2);
  return prefix + styleSettingValue(value);
}

export function styleSectionBold(text: string): string {
  return theme.sectionBold + text + theme.reset;
}

export const inquirerTheme = {
  prefix: purple + "?" + reset + " ",
  style: {
    message: (text: string): string => purple + bold + text + reset,
    help: (text: string): string => dim + cyan + text + reset,
    highlight: (text: string): string => pink + text + reset,
    key: (text: string): string => cyan + bold + "<" + text + ">" + reset,
    answer: (text: string): string => blue + text + reset,
  },
};
