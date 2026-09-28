/**
 * Drizzle's generated migrations are imported as modules and inlined into the
 * bundle by babel-plugin-inline-import (see babel.config.js). Metro resolves
 * them because metro.config.js adds `sql` to sourceExts; this tells TypeScript
 * what they are.
 */
declare module '*.sql' {
  const content: string;
  export default content;
}
