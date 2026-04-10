import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { indexAllTexts } from './searchIndex.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const bundledSourceDir = path.resolve(moduleDir, '../../../vendor/sefaria');
const dataDir = process.env.SEFARIA_DATA_DIR || '/data/sefaria';
const sourceDir = process.env.SEFARIA_SOURCE_DIR || bundledSourceDir;
const markerPath = path.join(dataDir, '.downloaded');

const status = {
  running: false,
  phase: 'idle',
  error: null,
  startedAt: null,
  completedAt: null,
};

function setStatus(patch) {
  Object.assign(status, patch);
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function normalizeLayout() {
  const extractedRoot = path.join(dataDir, 'Sefaria-Export-master');
  const targetRoot = path.join(dataDir, 'texts');
  if (await exists(extractedRoot)) {
    if (await exists(targetRoot)) {
      await fs.rm(targetRoot, { recursive: true, force: true });
    }
    await fs.rename(extractedRoot, targetRoot);
  }
}

async function copyDirectory(sourcePath, targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const from = path.join(sourcePath, entry.name);
    const to = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(from, to);
    } else if (entry.isFile()) {
      await fs.copyFile(from, to);
    }
  }
}

async function resolveSourceTextsDir() {
  if (!(await exists(sourceDir))) {
    throw new Error(`No vendored Sefaria source found at ${sourceDir}. Add the Sefaria export under vendor/sefaria/texts.`);
  }

  const directTextsDir = path.join(sourceDir, 'texts');
  const resolved = (await exists(directTextsDir)) ? directTextsDir : sourceDir;
  const englishFiles = await glob(path.join(resolved, '**', 'English', '*.json').replace(/\\/g, '/'));
  if (englishFiles.length === 0) {
    throw new Error(`Vendored Sefaria source at ${resolved} does not contain any English JSON text files.`);
  }

  return resolved;
}

export async function getImportReadiness() {
  try {
    const resolvedSourceDir = await resolveSourceTextsDir();
    return {
      sourceReady: true,
      sourcePath: resolvedSourceDir,
      sourceError: null,
    };
  } catch (error) {
    return {
      sourceReady: false,
      sourcePath: sourceDir,
      sourceError: error.message,
    };
  }
}

export function getImportStatus() {
  return { ...status, sourcePath: sourceDir };
}

export async function importLibrary({ force = false } = {}) {
  if (status.running) return getImportStatus();

  setStatus({
    running: true,
    phase: 'preparing',
    error: null,
    startedAt: new Date().toISOString(),
  });

  try {
    await fs.mkdir(dataDir, { recursive: true });

    if (force) {
      await fs.rm(path.join(dataDir, 'texts'), { recursive: true, force: true });
      await fs.rm(path.join(dataDir, 'Sefaria-Export-master'), { recursive: true, force: true });
      await fs.rm(markerPath, { force: true });
    }

    if (!(await exists(markerPath))) {
      const resolvedSourceDir = await resolveSourceTextsDir();
      setStatus({ phase: 'copying' });
      await fs.rm(path.join(dataDir, 'texts'), { recursive: true, force: true });
      await copyDirectory(resolvedSourceDir, path.join(dataDir, 'texts'));
      await normalizeLayout();
      await fs.writeFile(markerPath, new Date().toISOString());
    }

    setStatus({ phase: 'indexing' });
    const result = await indexAllTexts();

    setStatus({
      running: false,
      phase: 'completed',
      completedAt: new Date().toISOString(),
      error: null,
    });

    return { ...status, ...result };
  } catch (error) {
    setStatus({
      running: false,
      phase: 'failed',
      error: error.message,
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
}