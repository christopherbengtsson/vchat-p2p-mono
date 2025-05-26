import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAME_FEATURES_PATH = path.resolve(__dirname, '../src/features/game');

const DEFAULT_OPTIONS = {
  gameFeaturePath: GAME_FEATURES_PATH,
  excludePatterns: ['__tests__', 'node_modules', '.test.', '.spec.'],
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx'],
};

/**
 * Recursively scan a directory and return all TypeScript/JavaScript files
 */
function scanDirectory(dirPath, basePath = '', options = DEFAULT_OPTIONS) {
  const files = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      // Skip directories matching exclude patterns
      if (
        options.excludePatterns.some((pattern) => item.name.includes(pattern))
      ) {
        continue;
      }

      const subDirPath = path.join(dirPath, item.name);
      const subBasePath = basePath ? `${basePath}/${item.name}` : item.name;
      files.push(...scanDirectory(subDirPath, subBasePath, options));
    } else if (item.isFile()) {
      // Only include files with specified extensions, exclude test files
      const ext = path.extname(item.name);
      const isIncludedExtension = options.includeExtensions.includes(ext);
      const isExcludedFile = options.excludePatterns.some((pattern) =>
        item.name.includes(pattern),
      );

      if (isIncludedExtension && !isExcludedFile) {
        const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
        // Remove file extension for the import path
        const importPath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
        files.push(`@/features/game/${importPath}`);
      }
    }
  }

  return files;
}

/**
 * Generate game chunks configuration based on directory structure
 */
export function generateGameChunks(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks = {};

  if (!fs.existsSync(opts.gameFeaturePath)) {
    console.warn('Game features directory not found:', opts.gameFeaturePath);
    return chunks;
  }

  const gameDirectories = fs
    .readdirSync(opts.gameFeaturePath, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);

  for (const gameDir of gameDirectories) {
    const gamePath = path.join(opts.gameFeaturePath, gameDir);
    const files = scanDirectory(gamePath, gameDir, opts);

    if (files.length > 0) {
      // Determine chunk name based on directory
      let chunkName;
      if (gameDir === 'game-engine') {
        chunkName = 'game-engine';
      } else if (gameDir === 'game-invite') {
        chunkName = 'game-invite';
      } else {
        // For specific games, prefix with 'game-'
        chunkName = `game-${gameDir}`;
      }

      chunks[chunkName] = files.sort(); // Sort for consistent output
    }
  }

  return chunks;
}
