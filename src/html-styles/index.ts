export type { HtmlStyleDefinition, HtmlStyleClassRule } from "./types.js";
export {
  BUILT_IN_HTML_STYLE_ID,
  BUILT_IN_HTML_STYLE_IDS,
  isBuiltInHtmlStyleId,
} from "./types.js";
export {
  getBuiltInHtmlStyle,
  listCustomHtmlStyleIds,
  loadCustomHtmlStyle,
  saveCustomHtmlStyle,
  deleteCustomHtmlStyle,
  loadHtmlStyle,
} from "./storage.js";
export {
  validateCssPropertyName,
  validateCssPropertyValue,
  escapeCssValue,
} from "./utils/validate-css.js";
