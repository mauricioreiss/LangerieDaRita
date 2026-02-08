import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface SettingsState {
  settings: Record<string, string>
  isLoaded: boolean
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<boolean>
  getSetting: (key: string, fallback?: string) => string
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoaded: false,

  fetchSettings: async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')

    if (data) {
      const map: Record<string, string> = {}
      data.forEach(row => {
        map[row.key] = row.value
      })
      set({ settings: map, isLoaded: true })
    }
  },

  updateSetting: async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)

    if (!error) {
      set(state => ({
        settings: { ...state.settings, [key]: value },
      }))
      return true
    }
    return false
  },

  getSetting: (key: string, fallback = '') => {
    return get().settings[key] || fallback
  },
}))
