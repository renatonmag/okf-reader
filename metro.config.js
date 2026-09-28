// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Drizzle emits migrations as .sql files that are imported as modules
// (see babel.config.js and src/db/migrations). Metro must resolve them.
config.resolver.sourceExts.push('sql');

// withUniwindConfig has to be the outermost wrapper, so it sees the finished config.
module.exports = withUniwindConfig(config, {
  // Relative path strings only — Uniwind rejects absolute or path.resolve() values.
  // Class-name scanning starts at this file's directory, which is why it lives in src/.
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
