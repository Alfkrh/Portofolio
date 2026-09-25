/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL API, mis. `/api` (default) atau `http://localhost:3000/api`. */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
