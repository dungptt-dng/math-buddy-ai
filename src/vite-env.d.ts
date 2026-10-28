/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" khi build cho GitHub Pages (không có máy chủ API). */
  readonly VITE_STATIC?: string
}
