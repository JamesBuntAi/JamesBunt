import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { supabase } from '../lib/supabase'
import { ADMIN_WALLET, resolveHandleToWallet } from '../lib/helpers'

export default function AdminPanel() {
    const wallet = useWallet()
    const me = wallet.publicKey?.toBase58() ?? ''
    if (!ADMIN_WALLET || me !== ADMIN_WALLET) return null

    const [handle, setHandle] = useState('')
    const [minutes, setMinutes] = useState('60')
    const [reason, setReason] = useState('')
    const [pinId, setPinId] = useState('')

    const clearPublic = async () => {
        await supabase.from('messages_public').delete().neq('id', -1)
        alert('Public chat cleared.')
    }

    const pinMessage = async () => {
        const id = Number(pinId)
        if (!id) return
        await supabase.from('pinned_public').insert({ message_id: id, created_by: me })
        alert('Pinned.')
    }

    const mute = async (ban = false) => {
        const w = await resolveHandleToWallet(handle)
        if (!w) return alert('Cannot resolve handle')
        const until = new Date(Date.now() + (parseInt(minutes) || 60) * 60 * 1000).toISOString()
        const patch = ban ? { banned_until: until } : { muted_until: until }
        await supabase.from('moderation').upsert({ wallet: w, reason, ...patch })
        alert(ban ? 'Banned' : 'Muted')
    }

    const unrestrict = async () => {
        const w = await resolveHandleToWallet(handle)
        if (!w) return
        await supabase.from('moderation').upsert({ wallet: w, muted_until: null, banned_until: null, reason: null })
        alert('Restrictions lifted')
    }

    return (
        <div className="admin">
            <div className="row">
                <button className="btn" onClick={clearPublic}>Clear public</button>

                <input className="input" style={{ width: 120 }} placeholder="pin message id" value={pinId}
                       onChange={e => setPinId(e.target.value)} />
                <button className="btn" onClick={pinMessage}>Pin</button>

                <input className="input" style={{ width: 160 }} placeholder="@nick or wallet"
                       value={handle} onChange={e => setHandle(e.target.value)} />
                <input className="input" style={{ width: 90 }} placeholder="mins"
                       value={minutes} onChange={e => setMinutes(e.target.value)} />
                <input className="input" style={{ width: 220 }} placeholder="reason…"
                       value={reason} onChange={e => setReason(e.target.value)} />
                <button className="btn" onClick={() => mute(false)}>Mute</button>
                <button className="btn" onClick={() => mute(true)}>Ban</button>
                <button className="btn" onClick={unrestrict}>Unrestrict</button>
            </div>
        </div>
    )
}
