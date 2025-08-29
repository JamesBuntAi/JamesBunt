import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { supabase } from '../lib/supabase'
import PublicChat from './PublicChat'
import PrivateChat from './PrivateChat'
import AiChat from './AiChat'
import AdminPanel from './AdminPanel'
import type { AiMsg } from '../lib/types'

export default function ChatPanel() {
    const [tab, setTab] = useState<'public' | 'private' | 'ai'>('public')
    const wallet = useWallet()
    const me = wallet.publicKey?.toBase58() ?? null
    const [pmCount, setPmCount] = useState(0)
    const [pmTarget, setPmTarget] = useState<string>('')

    const [aiHistory, setAiHistory] = useState<AiMsg[]>([
        { from: 'AI', text: "Hey. I'm JAMES BUNT AI — ask me anything. If it's dumb, I'll tell you why." }
    ])

    useEffect(() => {
        if (!me) return
        const ch = supabase
            .channel(`pm-inbox-${me}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages_private', filter: `to_wallet=eq.${me}` },
                () => { if (tab !== 'private') setPmCount(c => c + 1) }
            )
            .subscribe()
        return () => { ch.unsubscribe() }
    }, [me, tab])

    useEffect(() => { if (tab === 'private') setPmCount(0) }, [tab])

    const startDMByHandle = async (handle: string) => {
        // resolve внутри PrivateChat при addPeer, здесь просто прокидываем
        setPmTarget(handle)
        setTab('private')
    }

    return (
        <section className="card crt chat-card">
            <div className="tabs tabs-square">
                <button className={`tab ${tab === 'public' ? 'active' : ''}`} onClick={() => setTab('public')}>Public</button>
                <button className={`tab ${tab === 'private' ? 'active' : ''}`} onClick={() => setTab('private')}>
                    Private {pmCount > 0 && <span className="badge">{pmCount}</span>}
                </button>
                <button className={`tab ${tab === 'ai' ? 'active' : ''}`} onClick={() => setTab('ai')}>AI</button>
            </div>

            <AdminPanel />

            <div className="chat-content">
                {tab === 'public' && <PublicChat onStartDM={startDMByHandle} />}
                {tab === 'private' && <PrivateChat initialPeer={pmTarget} />}
                {tab === 'ai' && <AiChat history={aiHistory} setHistory={setAiHistory} />}
            </div>
        </section>
    )
}
