import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAdmin: false,

  initialize: async () => {
    try {
      // Skip getSession if we already have a valid session in state
      const currentSession = get().session
      if (currentSession?.user) {
        await get().fetchProfile(currentSession.user.id)
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          set({ user: session.user, session })
          await get().fetchProfile(session.user.id)
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      set({ isLoading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ user: session?.user ?? null, session })
      if (session?.user) {
        await get().fetchProfile(session.user.id)
      } else {
        set({ profile: null, isAdmin: false })
      }
    })
  },

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      set({ profile: data, isAdmin: data.role === 'admin' })
    }
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    const internalEmail = email.includes('@') ? email : email.trim().toLowerCase() + '@app.interno'
    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) return { error: error.message }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: internalEmail,
        full_name: fullName,
        role: 'customer',
      })
    }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null, isAdmin: false })
  },
}))
