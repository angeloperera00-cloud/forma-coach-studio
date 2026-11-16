/**
 * Lists user-facing Italian strings that are NOT wrapped in t()/tn()/msg().
 * Usage: npx tsx scripts/i18n-scan.ts [--json] [paths...]
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const targets = args.filter((a) => !a.startsWith("--"));
const SKIP_DIRS = ["src/lib/data/seed", "src/lib/i18n/en.ts", "src/lib/data/demo", "src/lib/data/supabase"];

const SKIP_ATTRS = new Set([
  "className", "href", "src", "key", "id", "type", "name", "role", "variant", "size", "side", "align", "htmlFor", "inputMode",
  "autoComplete", "as", "folder", "emoji", "target", "rel", "method", "sizes", "value", "defaultValue", "lang", "dir", "accept",
  "fill", "stroke", "viewBox", "d", "xmlns", "strokeWidth", "strokeLinecap", "strokeLinejoin", "fontFamily", "tabIndex", "mode",
  "layout", "dataKey", "orientation", "shape", "kind", "status", "tab", "initialTab", "fontSize", "fontWeight", "textAnchor",
  "stopColor", "offset", "gradientTransform", "x", "y", "points", "transform", "aria-hidden", "aria-current", "aria-live",
  "aria-controls", "aria-describedby", "aria-labelledby", "aria-haspopup", "aria-expanded", "aria-orientation", "form", "pattern",
  "step", "min", "max", "enterKeyHint", "spellCheck", "capture", "decoding", "loading", "referrerPolicy", "crossOrigin", "media",
  "position", "unit", "color", "stackId", "strokeDasharray", "fillOpacity", "interval", "domain", "reducedMotion", "theme",
  "richColors", "closeButton", "content-type", "rootMargin", "metric", "slot", "asChild", "scroll", "prefetch", "replace", "inert",
]);
const SKIP_CALLS = new Set(["cn", "cva", "t", "tn", "msg", "has", "require", "fetch", "redirect", "notFound", "revalidatePath", "revalidateTag",
  "push", "replace", "replaceState", "pushState", "get", "set", "delete", "getItem", "setItem", "removeItem", "querySelector", "querySelectorAll",
  "matchMedia", "addEventListener", "removeEventListener", "createElement", "includes", "startsWith", "endsWith", "split", "join",
  "padStart", "toLocaleString", "Intl.NumberFormat", "format", "parse", "safeParse", "regex", "useMediaQuery", "useSearchParams", "headers",
  "setHeader", "append", "from", "select", "eq", "order", "rpc", "storage", "upload", "createSignedUrl", "getPublicUrl", "in", "is", "gte", "lt",
  "upsert", "insert", "update", "single", "maybeSingle", "range", "limit", "match", "test", "localeCompare", "toFixed", "Error", "log", "warn", "error", "info", "debug",
  "Image", "font", "register", "readFile", "writeFile", "mkdir", "stat", "rename", "rm", "join", "resolve", "createHash", "createHmac", "importKey", "sign", "verify",
  "getAll", "setAll", "cookies", "watch", "setValue", "getValues", "trigger", "resetField", "setFocus", "clearErrors", "useFieldArray", "Controller", "listActivity",
]);
const ITALIAN_HINT = /[àèéìòù]|\b(il|lo|la|gli|le|un|una|di|da|del|della|per|con|non|nel|nella|sul|alla|al|dei|delle|che|è|e|o|a|in|su|tra|fra)\b/i;

interface Hit { file: string; line: number; kind: string; text: string }
const hits: Hit[] = [];

function looksUserFacing(text: string): boolean {
  const s = text.trim();
  if (!s || !/[A-Za-zÀ-ÿ]/.test(s)) return false;
  if (/^[a-z0-9_\-./:#@?=&%[\]()]+$/.test(s)) return false; // enum/ids/paths/classes
  if (/^(https?:|\/|#|data:|image\/|application\/|text\/)/.test(s)) return false;
  if (/^[\w-]+(:[\w-]+)*(\s+[\w:\-[\]/.()%#!]+)+$/.test(s) && /(^|\s)(flex|grid|text-|bg-|px-|py-|rounded|border|size-|w-|h-|gap-|items-|justify-|max-|min-|font-|shadow|hidden|block|inline|absolute|relative|sticky|top-|left-|right-|bottom-|z-|p-|m[trblxy]?-|overflow|transition|duration|ease|opacity|ring|outline|cursor|select-|truncate|line-clamp|tabular|uppercase|tracking|leading|object-|aspect-|shrink|grow|basis|col-|row-|order-|self-|place-|space-|divide|sr-only|not-sr-only|animate|fill-|stroke-|data-|group|peer|\[)/.test(s)) return false;
  if (/^[A-Z_]+$/.test(s)) return false; // CONSTANTS
  if (/^\{?\w+\}?$/.test(s) && s === s.toLowerCase()) return false;
  return /\s/.test(s) || /^[A-ZÀ-Ý]/.test(s) || ITALIAN_HINT.test(s);
}

function calleeName(expr: ts.LeftHandSideExpression): string {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return "";
}

function skipByContext(node: ts.Node): boolean {
  let child: ts.Node = node;
  let p = node.parent;
  while (p) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isExternalModuleReference(p)) return true;
    if (ts.isJsxAttribute(p)) {
      const name = p.name.getText();
      return SKIP_ATTRS.has(name) || name.startsWith("data-") || name.startsWith("on");
    }
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      const name = p.expression ? calleeName(p.expression as ts.LeftHandSideExpression) : "";
      if (SKIP_CALLS.has(name)) return true;
      if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && /^(console)$/.test(p.expression.expression.getText())) return true;
    }
    if (ts.isPropertyAssignment(p) && p.name === child) return true; // object key
    if (ts.isPropertyAssignment(p) && ["className", "href", "icon", "id", "key", "type", "variant", "value", "kind", "status", "dataKey", "unit", "fill", "color", "slug", "group", "image", "emoji", "dot", "chip", "tone", "path", "folder", "accept"].includes(p.name.getText())) return true;
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
    if (ts.isCaseClause(p) || ts.isElementAccessExpression(p) || ts.isTypeReferenceNode(p) || ts.isIndexedAccessTypeNode(p)) return true;
    if (ts.isExpressionStatement(p) && ts.isStringLiteral(child)) return true; // directives
    if (ts.isTaggedTemplateExpression(p)) return true;
    if (ts.isJsxExpression(p) || ts.isBlock(p) || ts.isSourceFile(p) || ts.isReturnStatement(p) || ts.isVariableDeclaration(p) || ts.isArrayLiteralExpression(p) || ts.isConditionalExpression(p) || ts.isBinaryExpression(p) || ts.isParenthesizedExpression(p) || ts.isPropertyAssignment(p) || ts.isTemplateSpan(p) || ts.isTemplateExpression(p) || ts.isObjectLiteralExpression(p) || ts.isArrowFunction(p) || ts.isAsExpression(p) || ts.isSatisfiesExpression(p) || ts.isSpreadAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isNonNullExpression(p) || ts.isCallExpression(p) || ts.isNewExpression(p)) {
      child = p;
      p = p.parent;
      continue;
    }
    child = p;
    p = p.parent;
  }
  return false;
}

function scanFile(file: string) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file);
  const add = (node: ts.Node, kind: string, value: string) => {
    hits.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind, text: value.replace(/\s+/g, " ").trim() });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      if (looksUserFacing(node.text) && !/^[\s·•—–:,.()|/+-]*$/.test(node.text)) add(node, "jsx", node.text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (looksUserFacing(node.text) && !skipByContext(node)) add(node, "str", node.text);
    } else if (ts.isTemplateExpression(node)) {
      const raw = node.head.text + node.templateSpans.map((s) => "{…}" + s.literal.text).join("");
      if (looksUserFacing(raw.replace(/\{…\}/g, "")) && /[A-Za-zÀ-ÿ]{3,}/.test(raw.replace(/\{…\}/g, "")) && !skipByContext(node)) add(node, "tpl", raw);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (SKIP_DIRS.some((s) => rel.startsWith(s))) continue;
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|mts)$/.test(entry.name)) scanFile(full);
  }
}

for (const target of targets.length ? targets : ["src"]) {
  const full = path.resolve(ROOT, target);
  if (fs.statSync(full).isDirectory()) walk(full);
  else scanFile(full);
}

if (asJson) console.log(JSON.stringify(hits, null, 2));
else {
  for (const h of hits) console.log(`${h.file}:${h.line} [${h.kind}] ${h.text}`);
  const byFile = new Map<string, number>();
  for (const h of hits) byFile.set(h.file, (byFile.get(h.file) ?? 0) + 1);
  console.error(`\n${hits.length} untranslated strings in ${byFile.size} files`);
  for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) console.error(`${String(n).padStart(4)}  ${f}`);
}
