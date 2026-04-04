import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = resolve(__dirname, "../config/default.yaml");
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const targetVal = target[key];
        const sourceVal = source[key];
        if (targetVal &&
            sourceVal &&
            typeof targetVal === "object" &&
            typeof sourceVal === "object" &&
            !Array.isArray(targetVal) &&
            !Array.isArray(sourceVal)) {
            result[key] = deepMerge(targetVal, sourceVal);
        }
        else {
            result[key] = sourceVal;
        }
    }
    return result;
}
export async function loadConfig(userConfigPath) {
    const defaultRaw = readFileSync(DEFAULT_CONFIG_PATH, "utf-8");
    const defaults = parseYaml(defaultRaw);
    if (!userConfigPath) {
        return defaults;
    }
    try {
        const userRaw = readFileSync(resolve(userConfigPath), "utf-8");
        const userOverrides = parseYaml(userRaw);
        return deepMerge(defaults, userOverrides);
    }
    catch {
        // User config not found — use defaults
        return defaults;
    }
}
//# sourceMappingURL=config-loader.js.map