import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
/**
 * Decode an encoded project directory name to its full filesystem path.
 * The encoding replaces "/" with "-", but "-" also appears literally in
 * directory names (e.g., "ai-brain").
 *
 * Strategy: split on "-" to get segments, then walk from root trying
 * progressively longer hyphenated names to find real directories on disk.
 */
export async function decodeToFullPath(encoded) {
    const cleaned = encoded.startsWith("-") ? encoded.substring(1) : encoded;
    const segments = cleaned.split("-");
    const cache = new Map();
    const isDirectory = async (path) => {
        try {
            const s = await stat(path);
            return s.isDirectory();
        }
        catch {
            return false;
        }
    };
    const resolvePath = async (index, basePath) => {
        if (index >= segments.length)
            return basePath;
        const cacheKey = `${index}:${basePath}`;
        if (cache.has(cacheKey))
            return cache.get(cacheKey) ?? null;
        let candidate = segments[index];
        for (let j = index; j < segments.length; j++) {
            if (j > index) {
                candidate += "-" + segments[j];
            }
            const testPath = join(basePath, candidate);
            if (await isDirectory(testPath)) {
                const resolved = await resolvePath(j + 1, testPath);
                if (resolved) {
                    cache.set(cacheKey, resolved);
                    return resolved;
                }
            }
        }
        cache.set(cacheKey, null);
        return null;
    };
    return resolvePath(0, "/");
}
async function readPackageDeps(pkgPath, includeDev) {
    try {
        const raw = await readFile(pkgPath, "utf-8");
        const pkg = JSON.parse(raw);
        const deps = [];
        const devDeps = [];
        if (pkg.dependencies)
            deps.push(...Object.keys(pkg.dependencies));
        if (includeDev && pkg.devDependencies)
            devDeps.push(...Object.keys(pkg.devDependencies));
        const workspaces = Array.isArray(pkg.workspaces)
            ? pkg.workspaces
            : (pkg.workspaces?.packages ?? []);
        return { deps, devDeps, workspaces };
    }
    catch {
        return { deps: [], devDeps: [], workspaces: [] };
    }
}
async function resolveWorkspaces(projectRoot, patterns) {
    const dirs = [];
    for (const pattern of patterns) {
        try {
            if (pattern.endsWith("/*")) {
                const parentDir = join(projectRoot, pattern.slice(0, -2));
                const entries = await readdir(parentDir).catch(() => []);
                for (const entry of entries) {
                    const fullPath = join(parentDir, entry);
                    try {
                        const s = await stat(fullPath);
                        if (s.isDirectory())
                            dirs.push(fullPath);
                    }
                    catch {
                        /* skip */
                    }
                }
            }
            else if (!pattern.includes("*")) {
                const fullPath = join(projectRoot, pattern);
                try {
                    const s = await stat(fullPath);
                    if (s.isDirectory())
                        dirs.push(fullPath);
                }
                catch {
                    /* skip */
                }
            }
        }
        catch {
            /* skip unresolvable */
        }
    }
    return dirs;
}
export async function discoverProjectDeps(projectsBasePath, options) {
    const resolvedBase = projectsBasePath.replace(/^~/, homedir());
    const projects = [];
    const packageDetails = new Map();
    let encodedDirs;
    try {
        encodedDirs = await readdir(resolvedBase);
    }
    catch {
        return { projects: [], packages: new Set(), packageDetails };
    }
    for (const encodedDir of encodedDirs) {
        const projectPath = await decodeToFullPath(encodedDir);
        if (!projectPath)
            continue;
        const rootPkgPath = join(projectPath, "package.json");
        const { deps: rootDeps, devDeps: rootDevDeps, workspaces } = await readPackageDeps(rootPkgPath, options.includeDev);
        if (rootDeps.length === 0 && workspaces.length === 0) {
            try {
                await readFile(rootPkgPath, "utf-8");
            }
            catch {
                continue;
            }
        }
        projects.push({ path: projectPath, encodedDir });
        const recordDependency = (dep, isDev) => {
            const existing = packageDetails.get(dep);
            if (existing) {
                if (!existing.usedBy.includes(projectPath))
                    existing.usedBy.push(projectPath);
                if (!isDev && existing.isDev)
                    existing.isDev = false;
            }
            else {
                packageDetails.set(dep, {
                    name: dep,
                    usedBy: [projectPath],
                    isDev,
                });
            }
        };
        for (const dep of rootDeps)
            recordDependency(dep, false);
        for (const dep of rootDevDeps)
            recordDependency(dep, true);
        if (workspaces.length > 0) {
            const workspaceDirs = await resolveWorkspaces(projectPath, workspaces);
            for (const wsDir of workspaceDirs) {
                const { deps: wsDeps, devDeps: wsDevDeps } = await readPackageDeps(join(wsDir, "package.json"), options.includeDev);
                for (const dep of wsDeps)
                    recordDependency(dep, false);
                for (const dep of wsDevDeps)
                    recordDependency(dep, true);
            }
        }
    }
    return {
        projects,
        packages: new Set(packageDetails.keys()),
        packageDetails,
    };
}
//# sourceMappingURL=project-discovery.js.map