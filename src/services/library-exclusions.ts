import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseExcludedCatalogIds } from "@/lib/library-exclusions";

const DATA_DIRECTORY_NAME = "data";
const EXCLUSIONS_FILE_NAME = "library-exclusions.json";

function getWorkspaceRoot(): string {
  return path.resolve(process.cwd());
}

export function getLibraryExclusionsFilePath(): string {
  const workspaceRoot = getWorkspaceRoot();
  const filePath = path.resolve(
    workspaceRoot,
    DATA_DIRECTORY_NAME,
    EXCLUSIONS_FILE_NAME,
  );
  const relativePath = path.relative(workspaceRoot, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Exclusion file path left the workspace.");
  }
  return filePath;
}

export async function readLibraryExclusions(): Promise<string[]> {
  try {
    const fileContents = await readFile(getLibraryExclusionsFilePath(), "utf8");
    const parsed: unknown = JSON.parse(fileContents);
    return parseExcludedCatalogIds(parsed) ?? [];
  } catch (error: unknown) {
    if (isNodeErrnoException(error) && error.code === "ENOENT") {
      return [];
    }
    return [];
  }
}

export async function addLibraryExclusion(catalogId: string): Promise<string[]> {
  const catalogIds = await readLibraryExclusions();
  if (!catalogIds.includes(catalogId)) {
    catalogIds.push(catalogId);
  }
  await writeLibraryExclusions(catalogIds);
  return catalogIds;
}

async function writeLibraryExclusions(catalogIds: string[]): Promise<void> {
  const filePath = getLibraryExclusionsFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify({ catalogIds }, null, 2)}\n`,
    "utf8",
  );
}

function isNodeErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}
