/** Send-time interception adapter. The matcher intentionally uses public Valenced
 * module finder APIs; Discord's concrete sendMessage module is resolved at runtime. */
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { before } from '@valenced/patcher'
import { expandAtSend } from './core.js'


export function locateMessageModule() {
  // Revenge's reference implementation identifies the module by these two exports.
  // Valenced's finder is checked defensively and will return no match if exports
  // are not present in this Discord build.
  const [module, moduleId] = lookupModule(withProps('sendMessage', 'receiveMessage'))
  return { module, moduleId }
}


export function installSendHook({ module, moduleId, getSettings, logger }: any) {
  if (!module || moduleId === undefined || typeof module.sendMessage !== 'function') {
    logger?.warn?.('[Text Replacement] sendMessage module was not found; hook skipped.')
    return null
  }
  return before(module, 'sendMessage', (args: any[]) => {
    try {
      const settings = getSettings?.()
      if (settings?.enabled === false) return
      const content = args?.[1]?.content
      if (typeof content !== 'string' || !Array.isArray(settings?.shortcuts)) return
      const expanded = expandAtSend(content, settings.shortcuts)
      if (expanded !== content) args[1].content = expanded
    } catch (error) {
      logger?.error?.('[Text Replacement] send hook error', error)
    }
  })
}
