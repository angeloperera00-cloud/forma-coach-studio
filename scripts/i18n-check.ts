/**
 * Lists Italian source strings that have no English translation in src/lib/i18n/en.ts.
 * Usage: npm run i18n:check            (exit code 1 if something is missing)
 *        npm run i18n:check -- --json  (machine-readable list)
 *        npm run i18n:check -- --unused (also list catalogue entries no longer used)
 *
 * Extracted: t()/tn()/msg()/msgp() arguments, AppError messages, zod validation messages,
 * the label maps in constants.ts, activity templates and the demo activity seed.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { EN } from "../src/lib/i18n/en";

const ROOT = path.resolve(__dirname, "..");
const files: string[] = [];
(function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !full.endsWith(path.join("i18n", "en.ts"))) files.push(full);
  }
})(path.join(ROOT, "src"));

const found = new Map<string, string>();
const ZOD = new Set(["min", "max", "regex", "refine", "email", "enum", "uuid", "number", "length", "superRefine", "int", "positive", "nonnegative"]);
const UNIT = /^(kg|cm|%|g|ml|pz|kcal|min)$/;
const looksText = (s: string) => /[A-Za-zÀ-ÿ]/.test(s) && !/^[a-z0-9_\-./:]+$/.test(s) && !UNIT.test(s);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file);
  const isConstants = rel.endsWith(path.join("domain", "constants.ts"));
  const isSchemas = rel.endsWith(path.join("domain", "schemas.ts"));
  const isActivitySource = rel.includes(path.join("lib", "actions")) || rel.endsWith(path.join("data", "reminders.ts"));
  const isSeed = rel.endsWith(path.join("seed", "demo.ts"));
  const add = (node: ts.Node | undefined) => {
    if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && looksText(node.text)) found.set(node.text, rel);
  };
  const literalsOf = (node: ts.Node | undefined): void => {
    if (!node) return;
    if (ts.isConditionalExpression(node)) {
      literalsOf(node.whenTrue);
      literalsOf(node.whenFalse);
    } else if (ts.isParenthesizedExpression(node)) literalsOf(node.expression);
    else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "msg") add(node.arguments[0]);
    else add(node);
  };

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (name === "t" || name === "msg" || name === "msgp") add(node.arguments[0]);
      if (name === "tn") {
        add(node.arguments[0]);
        add(node.arguments[1]);
      }
      if (name === "find" && node.arguments.length === 3) add(node.arguments[2]);
      if (ZOD.has(name)) for (const a of node.arguments) add(a);
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && /.Error$/.test(node.expression.text)) add(node.arguments?.[0]);
    if (ts.isPropertyAssignment(node) && node.name.getText() === "message") literalsOf(node.initializer);
    if (isActivitySource && ts.isPropertyAssignment(node) && ["title", "description"].includes(node.name.getText())) literalsOf(node.initializer);
    if (isConstants && ts.isVariableDeclaration(node) && /(_LABELS|_SHORT)$/.test(node.name.getText()) && node.initializer) {
      const collect = (n: ts.Node) => {
        if (ts.isPropertyAssignment(n) && ["unit", "digits"].includes(n.name.getText())) return;
        add(n);
        ts.forEachChild(n, collect);
      };
      collect(node.initializer);
    }
    if (isSchemas && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /\s|^[A-ZÀ-Ý]/.test(node.text) && !ts.isImportDeclaration(node.parent)) add(node);
    if (isSeed && ts.isVariableDeclaration(node) && node.name.getText() === "ACTS" && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      for (const el of node.initializer.elements)
        if (ts.isArrayLiteralExpression(el)) {
          add(el.elements[3]);
          add(el.elements[4]);
        }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const missing = [...found.entries()].filter(([s]) => !(s in EN));
const unused = Object.keys(EN).filter((k) => !found.has(k));
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(missing.map(([s, f]) => ({ s, f })), null, 1));
} else {
  console.log(`${found.size} strings · ${missing.length} missing English · ${unused.length} unused`);
  for (const [s, f] of missing) console.log(`  - ${JSON.stringify(s)}  (${f})`);
  if (process.argv.includes("--unused")) for (const u of unused) console.log(`  ~ unused: ${JSON.stringify(u)}`);
}
process.exitCode = missing.length ? 1 : 0;
