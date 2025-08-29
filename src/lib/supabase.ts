// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let supabase: SupabaseClient

if (url && anon) {
    supabase = createClient(url, anon, {
        realtime: { params: { eventsPerSecond: 2 } },
    })
} else {

    console.warn('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы. Чаты работать не будут.')
    const noop = async (ret: any = { data: [], error: null }) => ret
    const rt = {
        on: () => rt,
        subscribe: () => ({ unsubscribe(){} }),
    }
    supabase = {
        from: () => ({ select: noop, insert: noop, upsert: noop, order: () => ({ select: noop }) } as any),
        channel: () => rt as any,
    } as unknown as SupabaseClient
}

export { supabase }
