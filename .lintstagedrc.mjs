export default {
  '*': 'eslint',
  'apps/server/**/*.{ts,tsx}?(x)': () => 'pnpm run server run typecheck',
  'apps/web/**/*.{ts,tsx}?(x)': () => 'pnpm run web run typecheck',
  'packages/**/*.{ts,tsx}?(x)': (filePaths) => {
    const packageNames = [
      ...new Set(
        filePaths
          .map((filePath) => {
            const matches = filePath.match(/packages\/([^/]+)/);
            return matches ? matches[1] : '';
          })
          .filter(Boolean),
      ),
    ];

    return [
      ...packageNames.map(
        (packageName) => `pnpm run ${packageName} run typecheck`,
      ),
    ];
  },
};
