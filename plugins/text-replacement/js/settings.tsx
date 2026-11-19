import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Switch } from 'react-native'
import { parseShortcutJson, parseGboardExport, mergeShortcuts } from './core.js'


export function SettingsComponent({ api }: { api: any }) {
  const storage = api.jsonStorage
  const data = storage.use() ?? { enabled: true, shortcuts: [] }
  const [trigger, setTrigger] = useState('')
  const [replacement, setReplacement] = useState('')
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const s: any = {
    container: { padding: 16, gap: 12 }, title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    hint: { opacity: 0.7, marginBottom: 8 }, field: { borderWidth: 1, borderColor: '#77777755', borderRadius: 8, padding: 10, marginBottom: 8 },
    button: { backgroundColor: '#5865f2', padding: 12, borderRadius: 8, marginVertical: 4 }, buttonText: { color: 'white', fontWeight: '600', textAlign: 'center' }, row: { borderBottomWidth: 1, borderColor: '#77777733', paddingVertical: 10 },
  }
  const save = (next: any) => storage.set({ enabled: data.enabled !== false, shortcuts: next })
  const saveEnabled = (enabled: boolean) => storage.set({ enabled, shortcuts: data.shortcuts ?? [] })
  const addOrUpdate = () => {
    const t = trigger.trim(), r = replacement
    if (!t || !r.trim() || /\s/.test(t)) return
    const next = (data.shortcuts ?? []).filter((row: any) => row.trigger !== t && row.trigger !== editing)
    next.push({ trigger: t, replacement: r })
    save(mergeShortcuts([], next)); setTrigger(''); setReplacement(''); setEditing(null)
  }
  const importNow = (format: 'json' | 'gboard') => {
    try {
      const rows = format === 'json' ? parseShortcutJson(importText) : parseGboardExport(importText)
      save(mergeShortcuts(data.shortcuts ?? [], rows))
      setImportStatus(`Merged ${rows.length} shortcut entries.`); setImportText('')
    } catch (error: any) { setImportStatus(`Import error: ${error?.message ?? String(error)}`) }
  }
  return <ScrollView><View style={s.container}>
    <Text style={s.title}>Text Replacement</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text>Enable replacements</Text><Switch value={data.enabled !== false} onValueChange={saveEnabled}/></View>
    <Text style={s.hint}>Shortcuts are expanded just before a message sends. Example: arb → @mention text</Text>
    <TextInput style={s.field} placeholder="Trigger (no spaces)" value={trigger} onChangeText={setTrigger} autoCapitalize="none" />
    <TextInput style={[s.field, { minHeight: 84 }]} placeholder="Replacement text" value={replacement} onChangeText={setReplacement} multiline />
    <Pressable style={s.button} onPress={addOrUpdate}><Text style={s.buttonText}>{editing ? 'Save shortcut' : 'Add shortcut'}</Text></Pressable>
    <Text style={s.title}>Saved shortcuts ({(data.shortcuts ?? []).length})</Text>
    {(data.shortcuts ?? []).map((row: any) => <View key={row.trigger} style={s.row}>
      <Text style={{ fontWeight: '700' }}>{row.trigger}</Text><Text>{row.replacement}</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
        <Pressable onPress={() => { setTrigger(row.trigger); setReplacement(row.replacement); setEditing(row.trigger) }}><Text style={{ color: '#5865f2' }}>Edit</Text></Pressable>
        <Pressable onPress={() => save((data.shortcuts ?? []).filter((r: any) => r.trigger !== row.trigger))}><Text style={{ color: '#ed4245' }}>Delete</Text></Pressable>
      </View></View>)}
    <Text style={s.title}>Import shortcuts</Text><Text style={s.hint}>Paste JSON or a Gboard dictionary export</Text>
    <TextInput style={[s.field, { minHeight: 140 }]} placeholder="Paste file contents here" value={importText} onChangeText={setImportText} multiline autoCapitalize="none" />
    <Pressable style={s.button} onPress={() => importNow('json')}><Text style={s.buttonText}>Import JSON</Text></Pressable>
    <Pressable style={s.button} onPress={() => importNow('gboard')}><Text style={s.buttonText}>Import Gboard / CSV</Text></Pressable>
    {!!importStatus && <Text>{importStatus}</Text>}
  </View></ScrollView>
}
