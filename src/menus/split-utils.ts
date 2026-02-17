import process from "node:process";
import { clearScreen } from "./utils.js";
import {
  styleHint,
  styleHintTips,
  styleSelectedRow,
  styleMessage,
  theme,
} from "./colors.js";

const RESERVE_ROWS = 7;

export function getSplitPanelWidths(): {
  left: number;
  right: number;
  total: number;
} {
  const cols =
    typeof process.stdout.columns === "number" && process.stdout.columns > 0
      ? process.stdout.columns
      : 80;
  const left = Math.max(24, Math.floor(cols / 2) - 2);
  const right = Math.max(24, cols - left - 7);
  return { left, right, total: left + right + 7 };
}

export function getSplitPageSize(): number {
  const rows =
    typeof process.stdout.rows === "number" && process.stdout.rows > 0
      ? process.stdout.rows
      : 24;
  return Math.max(7, rows - RESERVE_ROWS);
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex -- ANSI escape codes
  return s.replace(/\x1b\[[\d;]*m/g, "");
}

function truncateToWidth(s: string, width: number): string {
  const plain = stripAnsi(s);
  if (plain.length <= width) return s;
  return s.slice(0, s.length - (plain.length - width + 1)) + "…";
}

function padLine(content: string, width: number): string {
  const plain = stripAnsi(content);
  const pad = plain.length < width ? " ".repeat(width - plain.length) : "";
  return content + pad;
}

export function drawSplitFrame(
  leftTitle: string,
  leftLines: string[],
  leftSelectedIndex: number,
  leftActive: boolean,
  rightTitle: string,
  rightLines: string[],
  rightSelectedIndex: number,
  status: string,
  commonHint: string,
  browserHint: string,
  selectedHint: string
): void {
  const {
    left: leftW,
    right: rightW,
    total: totalWidth,
  } = getSplitPanelWidths();
  const pageSize = getSplitPageSize();

  const leftStart = Math.max(
    0,
    Math.min(leftSelectedIndex, Math.max(0, leftLines.length - pageSize))
  );
  const rightStart = Math.max(
    0,
    Math.min(rightSelectedIndex, Math.max(0, rightLines.length - pageSize))
  );
  const leftVisible = leftLines.slice(leftStart, leftStart + pageSize);
  const rightVisible = rightLines.slice(rightStart, rightStart + pageSize);

  const leftTitleText = truncateToWidth(leftTitle, leftW);
  const rightTitleText = truncateToWidth(rightTitle, rightW);
  const leftTitleStyled =
    theme.bold +
    (leftActive
      ? theme.message + leftTitleText
      : theme.dim + theme.hint + leftTitleText) +
    theme.reset;
  const rightTitleStyled =
    theme.bold +
    (!leftActive
      ? theme.message + rightTitleText
      : theme.dim + theme.hint + rightTitleText) +
    theme.reset;

  clearScreen();
  process.stdout.write("╭" + "─".repeat(totalWidth - 2) + "╮\n");
  process.stdout.write(
    "│ " +
      padLine(leftTitleStyled, leftW) +
      " │ " +
      padLine(rightTitleStyled, rightW) +
      " │\n"
  );
  process.stdout.write(
    "├" + "─".repeat(leftW + 2) + "┼" + "─".repeat(rightW + 2) + "┤\n"
  );

  const maxRows = Math.max(leftVisible.length, rightVisible.length);
  for (let i = 0; i < maxRows; i++) {
    const leftLine = leftVisible[i]
      ? " " + padLine(leftVisible[i]!, leftW) + " "
      : " ".repeat(leftW + 2);
    const rightLine = rightVisible[i]
      ? " " + padLine(rightVisible[i]!, rightW) + " "
      : " ".repeat(rightW + 2);
    process.stdout.write("│" + leftLine + "│" + rightLine + "│\n");
  }

  process.stdout.write("├" + "─".repeat(totalWidth - 2) + "┤\n");
  process.stdout.write(
    "│ " + padLine(styleMessage(status), totalWidth - 4) + " │\n"
  );
  process.stdout.write("├" + "─".repeat(totalWidth - 2) + "┤\n");
  process.stdout.write(
    "│ " + padLine(styleHintTips(commonHint), totalWidth - 4) + " │\n"
  );
  const ctxHint = leftActive ? browserHint : selectedHint;
  const ctxLeft = leftActive ? ctxHint : "";
  const ctxRight = !leftActive ? ctxHint : "";
  process.stdout.write(
    "│ " +
      padLine(styleHintTips(truncateToWidth(ctxLeft, leftW)), leftW) +
      " │ " +
      padLine(styleHintTips(truncateToWidth(ctxRight, rightW)), rightW) +
      " │\n"
  );
  process.stdout.write("╰" + "─".repeat(totalWidth - 2) + "╯\n");
}

export function formatLeftEntry(
  name: string,
  isSelected: boolean,
  isInSelection: boolean | null,
  leftActive: boolean,
  width: number
): string {
  const checkbox = isInSelection === null ? " " : isInSelection ? "✓" : "○";
  const bullet = isSelected ? "▸ " : "  ";
  const content = bullet + checkbox + " " + name;
  const truncated = truncateToWidth(content, width - 2);
  if (!leftActive) return styleHint(truncated);
  if (isSelected) return styleSelectedRow(truncated);
  return truncated;
}

export function formatRightEntry(
  name: string,
  isSelected: boolean,
  rightActive: boolean,
  width: number
): string {
  const bullet = isSelected ? "▸ " : "  ";
  const content = bullet + "✓ " + name;
  const truncated = truncateToWidth(content, width - 2);
  if (!rightActive) return styleHint(truncated);
  if (isSelected) return styleSelectedRow(truncated);
  return truncated;
}
