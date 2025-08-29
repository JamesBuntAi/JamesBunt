import { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabase';
import { ADMIN_WALLET } from '../config';
import { PmMsg } from '../lib/types';
import { looksLikeWallet, resolveHandleToWallet, shortAddr } from '../lib/helpers';

type PeerInfo = { wallet: string; nickname?: string | null; last_at?: string };

export default function PrivateChat({ initialPeer }: { initialPeer?: string }) {
    const wallet = useWallet();
    const my = wallet.publicKey?.toBase58() ?? '';
    const isAdmin = !!my && !!ADMIN_WALLET && my === ADMIN_WALLET;

    const [messagesByPeer, setMessagesByPeer] = useState<Record<string, PmMsg[]>>({});
    const [peers, setPeers] = useState<PeerInfo[]>([]);
    const [active, setActive] = useState<string>('');
    const [text, setText] = useState('');
    const [newPeer, setNewPeer] = useState('');
    const [peerNickname, setPeerNickname] = useState('');
    const listEndRef = useRef<HTMLDivElement | null>(null);
    const scrollBottom = () => listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollBottom(); }, [active, messagesByPeer[active]?.length]);

    // hidden chats (local)
    const hiddenKey = useMemo(() => `pm_hidden_${my}`, [my]);
    const [hidden, setHidden] = useState<Record<string, true>>(() => {
        try { return JSON.parse(localStorage.getItem(hiddenKey) || '{}'); } catch { return {}; }
    });
    const hidePeerLocal = (w: string) => {
        setHidden(prev => {
            const next = { ...prev, [w]: true as const };
            localStorage.setItem(hiddenKey, JSON.stringify(next));
            return next;
        });
        if (active === w) setActive('');
    };

    // local nicknames for peers (only for current user)
    const nickLsKey = useMemo(() => `pm_local_nicks_${my}`, [my]);
    const [localNicks, setLocalNicks] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem(nickLsKey) || '{}'); } catch { return {}; }
    });
    const setLocalNick = (w: string, name: string) => {
        setLocalNicks(prev => {
            const next = { ...prev };
            const v = name.trim();
            if (v) next[w] = v; else delete next[w];
            localStorage.setItem(nickLsKey, JSON.stringify(next));
            return next;
        });
    };

    useEffect(() => {
        (async () => {
            if (!my) return;
            const { data } = await supabase
                .from('messages_private')
                .select('*')
                .or(`from_wallet.eq.${my},to_wallet.eq.${my}`)
                .order('created_at', { ascending: true })
                .limit(800);

            const map: Record<string, PmMsg[]> = {};
            (data || []).forEach((m: PmMsg) => {
                const peer = m.from_wallet === my ? m.to_wallet : m.from_wallet;
                if (!map[peer]) map[peer] = [];
                map[peer].push(m);
            });
            setMessagesByPeer(map);

            const wallets = Object.keys(map);
            const items: PeerInfo[] = wallets.map(w => ({
                wallet: w,
                nickname: null,
                last_at: map[w][map[w].length - 1]?.created_at
            })).sort((a, b) => (b.last_at || '').localeCompare(a.last_at || ''));

            setPeers(items);
            if (!active && items[0]) setActive(items[0].wallet);
        })();

        const ch = supabase
            .channel(`pm-feed-${my}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_private' }, (payload: any) => {
                const m = payload.new as PmMsg;
                if (m.from_wallet !== my && m.to_wallet !== my) return;
                const other = m.from_wallet === my ? m.to_wallet : m.from_wallet;
                setMessagesByPeer(prev => {
                    const arr = (prev[other] || []).concat(m).sort((a, b) => a.created_at.localeCompare(b.created_at));
                    return { ...prev, [other]: arr };
                });
                setPeers(prev => {
                    const had = prev.find(p => p.wallet === other);
                    const last_at = m.created_at;
                    if (had) return prev.map(p => p.wallet === other ? { ...p, last_at } : p)
                        .sort((a, b) => (b.last_at || '').localeCompare(a.last_at || ''));
                    return [{ wallet: other, nickname: null, last_at }, ...prev];
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages_private' }, (payload: any) => {
                // вытаскиваем id и обе стороны, чтобы убрать локально
                const m = payload.old as PmMsg;
                const other = m.from_wallet === my ? m.to_wallet : m.from_wallet;
                setMessagesByPeer(prev => {
                    const arr = (prev[other] || []).filter(x => x.id !== m.id);
                    return { ...prev, [other]: arr };
                });
            })
            .subscribe();

        return () => { ch.unsubscribe(); };
    }, [my]);

    // поддержка открытия из /dm @nick
    useEffect(() => {
        (async () => {
            if (!initialPeer) return;
            const w = await resolveHandleToWallet(initialPeer);
            if (w) setActive(w);
        })();
    }, [initialPeer]);

    const unreadOf = (peer: string) => {
        // (можно добавить lastSeen как у тебя раньше; опустим для краткости)
        return 0;
    };

    const openPeer = async (handleOrWallet: string) => {
        const w = await resolveHandleToWallet(handleOrWallet) || handleOrWallet;
        setActive(w);
        const serverNick = peers.find(p => p.wallet === w)?.nickname || '';
        setPeerNickname(localNicks[w] ?? serverNick ?? '');
    };

    const addPeer = async () => {
        const w = await resolveHandleToWallet(newPeer.trim());
        if (!w) return;
        if (!peers.find(p => p.wallet === w)) setPeers(prev => [{ wallet: w, nickname: null, last_at: '' }, ...prev]);
        setNewPeer('');
        openPeer(w);
    };

    const send = async () => {
        const t = text.trim();
        if (!t || !my || !active) return;
        await supabase.from('messages_private').insert({ from_wallet: my, to_wallet: active, text: t });
        setText('');
        setTimeout(scrollBottom, 0);
    };

    const savePeerNickname = () => {
        if (!active) return;
        setLocalNick(active, peerNickname);
        setPeers(prev => prev.map(p => p.wallet === active ? { ...p } : p));
    };

    const labelFor = (p: PeerInfo) => {
        const local = localNicks[p.wallet];
        if (local) return local;
        if (p.nickname && !looksLikeWallet(p.nickname)) return p.nickname;
        return shortAddr(p.wallet);
    };

    /* ————— удаление в ЛС ————— */
    const canDeleteMsg = (m: PmMsg) => (m.from_wallet === my) || isAdmin;

    const deleteMessage = async (id: number) => {
        const { error } = await supabase.from('messages_private').delete().eq('id', id);
        if (error) alert('Delete failed: ' + error.message);
        // локально почистим, остальным прилетит realtime DELETE
        setMessagesByPeer(prev => {
            const arr = (prev[active] || []).filter(x => x.id !== id);
            return { ...prev, [active]: arr };
        });
    };

    const deleteMineInDialog = async () => {
        if (!my || !active) return;
        const { error } = await supabase
            .from('messages_private')
            .delete()
            .match({ from_wallet: my, to_wallet: active });
        if (error) return alert('Delete failed: ' + error.message);
    };

    const deleteDialogForBoth = async () => {
        if (!my || !active) return;
        // Требует корректных RLS на DELETE для обеих сторон диалога
        const filter = `and(from_wallet.eq.${my},to_wallet.eq.${active}),and(from_wallet.eq.${active},to_wallet.eq.${my})`;
        const { error } = await supabase.from('messages_private').delete().or(filter);
        if (error) return alert('Delete failed: ' + error.message);
    };

    const activeMsgs = active ? (messagesByPeer[active] || []) : [];
    const visiblePeers = peers.filter(p => !hidden[p.wallet]);

    return (
        <div className="dm-grid">
            <aside className="dm-list">
                <div className="row">
                    <input className="input grow" placeholder="Start new: @nick or wallet"
                           value={newPeer} onChange={e => setNewPeer(e.target.value)}
                           onKeyDown={(e) => { if (e.key === 'Enter') addPeer(); }} />
                    <button className="btn" onClick={addPeer}>Open</button>
                </div>
                <div className="dialogs">
                    {visiblePeers.length === 0 && <div className="muted">No conversations yet.</div>}
                    {visiblePeers.map(p => {
                        const unread = unreadOf(p.wallet);
                        const label = labelFor(p);
                        return (
                            <button key={p.wallet}
                                    className={`dlg ${active === p.wallet ? 'active' : ''}`}
                                    onClick={() => openPeer(p.wallet)}>
                                <span className="dlg-name">{label}</span>
                                {unread > 0 && <span className="badge">{unread}</span>}
                            </button>
                        );
                    })}
                </div>
            </aside>

            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">
                        {active ? `Chat with ${labelFor({ wallet: active, nickname: peers.find(p => p.wallet === active)?.nickname ?? null })}` : 'Select a conversation'}
                    </div>
                    {active && (
                        <div className="row">
                            <input className="input" style={{ minWidth: 220 }} placeholder="Set nickname…"
                                   value={peerNickname} onChange={e => setPeerNickname(e.target.value)}
                                   onKeyDown={(e) => { if (e.key === 'Enter') savePeerNickname(); }} />
                            <button className="btn" onClick={savePeerNickname}>Save</button>
                            <button className="btn" onClick={() => hidePeerLocal(active)}>Hide</button>
                            <button className="btn" onClick={deleteMineInDialog}>Delete mine</button>
                            <button className="btn" onClick={deleteDialogForBoth}>Delete for both</button>
                        </div>
                    )}
                </div>

                <div className="list">
                    {activeMsgs.map(m => (
                        <div key={m.id} className="msg">
                            <div className="msg-meta">
                                {new Date(m.created_at).toLocaleTimeString()} — {m.from_wallet === my ? 'you' : shortAddr(m.from_wallet)}
                                {canDeleteMsg(m) && (
                                    <button className="link" onClick={() => deleteMessage(m.id)} style={{ marginLeft: 8 }}>
                                        delete
                                    </button>
                                )}
                            </div>
                            <div className="msg-text">{m.text}</div>
                        </div>
                    ))}
                    <div ref={listEndRef} />
                </div>

                <div className="row input-row">
                    <input className="input grow" placeholder="Message…"
                           value={text} onChange={(e) => setText(e.target.value)}
                           disabled={!active}
                           onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                    <button className="btn" onClick={send} disabled={!my || !active}>Send</button>
                </div>
            </div>
        </div>
    );
}
