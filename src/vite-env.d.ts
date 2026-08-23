/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  readonly VITE_EDIT_LOGO: string;
  /* Note: the old code read `import.meta.env.DEFAULT_PICTURE`, which Vite never exposes
     because it lacks the VITE_ prefix (audit finding F13). Declaring the correct name
     here makes the old spelling a compile error rather than a silent `undefined`. */
  readonly VITE_DEFAULT_PICTURE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
