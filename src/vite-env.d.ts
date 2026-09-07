/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'live'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ARCGIS_PORTAL_URL?: string
  readonly VITE_ARCGIS_WEBMAP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
