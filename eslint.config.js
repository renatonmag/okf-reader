// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  expoConfig,
  // Type-aware rules, TypeScript sources only — the config files at the repo root are
  // CommonJS and outside tsconfig's `include`, so linting them with type information
  // would error before it ever reached a rule.
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      // The rule this repo added the whole type-aware setup for. expo-file-system,
      // expo-sqlite and drizzle all expose async methods whose names do not look async
      // (`move`, `copy`, `delete`), and a missing `await` on one of them silently
      // reorders I/O and throws the rejection out of its enclosing try/catch — which is
      // exactly how a PDF cover once got deleted mid-move. Mark deliberate
      // fire-and-forget with `void`, as the rest of the codebase already does.
      '@typescript-eslint/no-floating-promises': 'error',
      // The same mistake in JSX: an async handler passed where a void return is
      // expected swallows its own rejection.
      '@typescript-eslint/no-misused-promises': 'error',
      // Off: `BookAdapter` declares its members as Promise-returning, so an adapter that
      // has nothing to await still has to be `async` to implement the interface. The rule
      // reads every such method as a mistake.
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    ignores: ["dist/*"],
  }
]);
