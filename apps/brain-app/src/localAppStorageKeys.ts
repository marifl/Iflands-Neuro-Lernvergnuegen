export const ATLAS_CONFIG_OVERRIDES_STORAGE_KEY = 'atlas-config-overrides'
export const AUTHORING_COMMAND_HISTORY_STORAGE_KEY = 'brain-app-authoring-command-history'
export const AUTHORING_SNAPSHOT_STORAGE_KEY = 'brain-app-authoring-snapshot'
export const LAST_APP_MODE_STORAGE_KEY = 'brain-app-last-app-mode'
export const SETTINGS_STORAGE_KEY = 'brain-app-settings'
export const THEME_STORAGE_KEY = 'ed-theme'

export const LOCAL_BRAIN_APP_STORAGE_KEYS = [
  ATLAS_CONFIG_OVERRIDES_STORAGE_KEY,
  AUTHORING_COMMAND_HISTORY_STORAGE_KEY,
  AUTHORING_SNAPSHOT_STORAGE_KEY,
  LAST_APP_MODE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  THEME_STORAGE_KEY,
] as const
