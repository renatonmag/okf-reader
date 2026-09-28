/**
 * `@/global.css` defines the CSS custom properties the web font stack in
 * `@/constants/theme` refers to. Expo generates an equivalent declaration into
 * the gitignored expo-env.d.ts at dev-server start; this makes a cold
 * `tsc --noEmit` work without having run the dev server first.
 */
declare module '*.css' {
  const content: string;
  export default content;
}
