module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Inlines the contents of Drizzle's generated .sql migrations into the
      // bundle, so migrations ship with the app instead of being read at runtime.
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
