export interface DiscoveredProject {
  /** Decoded filesystem path, e.g. /Users/peterbrown/Development/ai-brain */
  path: string;
  /** Encoded directory name from ~/.claude/projects/ */
  encodedDir: string;
}

export interface PackageInfo {
  /** npm package name */
  name: string;
  /** Which project paths use this package */
  usedBy: string[];
  /** Whether it's a devDependency (in any project) */
  isDev: boolean;
}

export interface ResolvedRepo {
  /** GitHub owner/repo, e.g. "get-convex/convex-backend" */
  repo: string;
  /** Repo description from GitHub/npm */
  repoDescription: string;
  /** All package names from user's deps that map to this repo */
  packages: string[];
  /** Project paths that use any of these packages */
  usedBy: string[];
}

export interface ReleaseEntry {
  /** All dep names from user's projects that map to this repo */
  packages: string[];
  /** GitHub owner/repo */
  repo: string;
  /** Repo description */
  repoDescription: string;
  /** Release details */
  release: {
    tag: string;
    name: string;
    publishedAt: string;
    body: string;
    url: string;
  };
  /** Which project paths use packages from this repo */
  usedBy: string[];
}

export interface ScanDepsOutput {
  scannedAt: string;
  projectCount: number;
  packageCount: number;
  reposResolved: number;
  reposWithoutReleases: number;
  rateLimited: boolean;
  errors: string[];
  releases: ReleaseEntry[];
}

/** Input from the scout skill describing an installed plugin */
export interface PluginInput {
  /** Plugin name, e.g. "superpowers" */
  name: string;
  /** Marketplace that hosts this plugin */
  marketplace: string;
  /** GitHub owner/repo */
  repo: string;
  /** Subdirectory within repo for monorepo plugins, null for dedicated repos */
  repoPath: string | null;
  /** Currently installed version */
  installedVersion: string;
  /** Git commit SHA of the installed version */
  gitCommitSha: string;
}

/** Extended release entry with plugin-specific fields */
export interface PluginReleaseEntry extends ReleaseEntry {
  /** Distinguishes plugin releases from npm dependency releases */
  sourceType: "plugin";
  /** Version currently installed locally */
  installedVersion: string;
}

/** Output shape when plugins are scanned */
export interface ScanDepsWithPluginsOutput extends ScanDepsOutput {
  pluginsScanned: number;
  pluginsWithUpdates: number;
}
