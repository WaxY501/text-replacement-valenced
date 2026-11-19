import { SettingsComponent as PluginSettingsComponent } from './settings.js'
import { installSendHook, locateMessageModule } from './send-hook.js'
import { expandAtSend } from './core.js'

interface Shortcut { trigger: string; replacement: string }
interface Settings { enabled: boolean; shortcuts: Shortcut[] }
const defaults: Settings = { enabled: true, shortcuts: [] }

export default plugin<{ jsonStorage: Settings }>({
  jsonStorage: { load: true, default: defaults, file: 'storage.json' },
  start({ cleanup, jsonStorage, logger }) {
    logger.log('[Text Replacement] Starting send-time shortcut expansion')
    const { module, moduleId } = locateMessageModule()
    const unpatch = installSendHook({
      module,
      moduleId,
      getSettings: () => jsonStorage.cache ?? defaults,
      logger,
    })
    if (unpatch) {
      cleanup(unpatch)
      logger.log(`[Text Replacement] Send hook installed on module ${moduleId}`)
    }
  },
  SettingsComponent({ api }) {
    return <PluginSettingsComponent api={api} />
  },
})

export { expandAtSend }
export { parseShortcutJson, parseGboardExport, mergeShortcuts } from './core.js'
