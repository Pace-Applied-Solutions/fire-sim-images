/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __COMMIT_SHA__: string;

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
