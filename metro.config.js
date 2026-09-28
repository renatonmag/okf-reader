// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Drizzle emits migrations as .sql files that are imported as modules
// (see babel.config.js and src/db/migrations). Metro must resolve them.
config.resolver.sourceExts.push('sql');

module.exports = config;
