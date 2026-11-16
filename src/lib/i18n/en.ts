/**
 * English catalogue: Italian source string → English.
 * Split by area in ./catalog; run `npm run i18n:check` to list missing entries.
 */
import { EN_APP } from "./catalog/app";
import { EN_DOMAIN } from "./catalog/domain";
import { EN_EDITORS } from "./catalog/editors";
import { EN_AUTH } from "./catalog/auth";

export const EN: Record<string, string> = { ...EN_DOMAIN, ...EN_APP, ...EN_EDITORS, ...EN_AUTH };
