import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { Config } from "./types/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = resolve(__dirname, "../config/default.yaml");

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const targetVal = target[key];
    const sourceVal = source[key];
    if (
      targetVal &&
      sourceVal &&
      typeof targetVal === "object" &&
      typeof sourceVal === "object" &&
      !Array.isArray(targetVal) &&
      !Array.isArray(sourceVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

export async function loadConfig(userConfigPath?: string): Promise<Config> {
  const defaultRaw = readFileSync(DEFAULT_CONFIG_PATH, "utf-8");
  const defaults = parseYaml(defaultRaw) as Record<string, unknown>;

  if (!userConfigPath) {
    return defaults as unknown as Config;
  }

  try {
    const userRaw = readFileSync(resolve(userConfigPath), "utf-8");
    const userOverrides = parseYaml(userRaw) as Record<string, unknown>;
    return deepMerge(defaults, userOverrides) as unknown as Config;
  } catch {
    // User config not found — use defaults
    return defaults as unknown as Config;
  }
}
