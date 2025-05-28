#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAME_FEATURES_PATH = path.resolve(__dirname, '../src/features/game');
const VITE_CONFIG_PATH = path.resolve(__dirname, '../vite.config.ts');

// Type definitions
export type GameChunkConfig = Record<string, string[]>;

export interface ChunkGenerationOptions {
  gameFeaturePath?: string;
  excludePatterns?: string[];
  includeExtensions?: string[];
}

const DEFAULT_OPTIONS: Required<ChunkGenerationOptions> = {
  gameFeaturePath: GAME_FEATURES_PATH,
  excludePatterns: ['__tests__', 'node_modules', '.test.', '.spec.'],
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx'],
};

/**
 * Recursively scan a directory and return all TypeScript/JavaScript files
 */
function scanDirectory(
  dirPath: string,
  basePath = '',
  options: Required<ChunkGenerationOptions> = DEFAULT_OPTIONS,
): string[] {
  const files: string[] = [];

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
export function generateGameChunks(
  options: ChunkGenerationOptions = {},
): GameChunkConfig {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: GameChunkConfig = {};

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
      let chunkName: string;
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

/**
 * Generate the manualChunks configuration string for Vite config
 */
function generateManualChunksConfig(gameChunks: GameChunkConfig): string {
  const chunkEntries: string[] = [];

  // Add game chunks with comments
  for (const [chunkName, files] of Object.entries(gameChunks)) {
    let comment: string;
    if (chunkName === 'game-engine') {
      comment = '// Game engine (shared across all games)';
    } else if (chunkName === 'game-invite') {
      comment = '// Game invitation system';
    } else {
      const gameName = chunkName.replace('game-', '');
      comment = `// ${gameName.charAt(0).toUpperCase() + gameName.slice(1)} game`;
    }

    const filesArray = files.map((file) => `'${file}',`).join('\n');

    chunkEntries.push(`${comment} '${chunkName}': [${filesArray}],`);
  }

  return chunkEntries.join('\n\n');
}

/**
 * Update the Vite config file with generated chunks
 */
export function updateViteConfig(gameChunks: GameChunkConfig): boolean {
  const configContent = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');

  // Generate the new game chunks configuration
  const newGameChunksConfig = generateManualChunksConfig(gameChunks);

  // Find the game chunks section and replace it
  const gameChunksStart = configContent.indexOf('// Game-specific chunks');
  const gameChunksEnd = configContent.indexOf('// Form handling');

  if (gameChunksStart === -1 || gameChunksEnd === -1) {
    console.error('Could not find game chunks section in vite.config.ts');
    console.error(
      'Make sure the config has "// Game-specific chunks" and "// Form handling" comments',
    );
    return false;
  }

  const beforeGameChunks = configContent.substring(0, gameChunksStart);
  const afterGameChunks = configContent.substring(gameChunksEnd);

  const newConfigContent =
    beforeGameChunks + newGameChunksConfig + '\n\n          ' + afterGameChunks;

  fs.writeFileSync(VITE_CONFIG_PATH, newConfigContent, 'utf8');

  return true;
}

/**
 * Main function for CLI usage
 */
function main(): void {
  console.log('🎮 Generating dynamic game chunks...');

  try {
    const gameChunks = generateGameChunks();

    console.log(`📁 Found ${Object.keys(gameChunks).length} game modules:`);
    for (const [chunkName, files] of Object.entries(gameChunks)) {
      console.log(`  - ${chunkName}: ${files.length} files`);
    }

    if (Object.keys(gameChunks).length === 0) {
      console.warn(
        '⚠️  No game chunks found. Make sure you have game directories in src/features/game/',
      );
      return;
    }

    const success = updateViteConfig(gameChunks);

    if (success) {
      console.log('✅ Vite config updated successfully!');
      console.log('📝 Updated chunks:');
      for (const chunkName of Object.keys(gameChunks)) {
        console.log(`   - ${chunkName}`);
      }
    } else {
      console.error('❌ Failed to update Vite config');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error generating game chunks:', (error as Error).message);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
