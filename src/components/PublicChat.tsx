import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabase';
import { ADMIN_WALLET } from '../config';
import { Profile, PubMsg } from '../lib/types';
import {
    isHexColor,
    looksLikeWallet,
    normalizeHex,
    resolveHandleToWallet,
    shortAddr,
    useGuestId,          // <—
} from '../lib/helpers';

export default function PublicChat({ onStartDM }: { onStartDM: (handle: string) => void }) {
    const wallet = useWallet();
    const my = wallet.publicKey?.toBase58() ?? null;
    const isAdmin = !!my && !!ADMIN_WALLET && my === ADMIN_WALLET;
    const guest = useGuestId();                // <—

    const [messages, setMessages] = useState<PubMsg[]>([]);
    const [text, setText] = useState('');
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const profilesRef = useRef(profiles);
    useEffect(() => { profilesRef.current = profiles; }, [profiles]);

    const [helpOpen, setHelpOpen] = useState(false);
    const listEndRef = useRef<HTMLDivElement | null>(null);
    const scrollBottom = () => listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollBottom(); }, [messages.length]);

    const canDeletePublic = (m: PubMsg) => (my && m.wallet === my) || isAdmin;

    const deletePublic = async (id: number) => {
        const { error } = await supabase.from('messages_public').delete().eq('id', id);
        if (error) alert('Delete failed: ' + error.message);
        setMessages(prev => prev.filter(x => x.id !== id));
    };

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('messages_public')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(500);
            setMessages(data ?? []);

            const wallets = Array.from(new Set((data ?? []).map(m => m.wallet).filter(Boolean))) as string[];
            if (wallets.length) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('wallet,nickname,color')
                    .in('wallet', wallets);
                const map: Record<string, Profile> = {};
                for (const p of profs || []) map[p.wallet] = p as Profile;
                setProfiles(map);
            }
        };
        load();

        const ch = supabase
            .channel('pubchat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_public' }, async (payload: any) => {
                const m = payload.new as PubMsg;
                setMessages(prev => [...prev, m]);
                if (m.wallet && !profilesRef.current[m.wallet]) {
                    const { data: p } = await supabase
                        .from('profiles')
                        .select('wallet,nickname,color')
                        .eq('wallet', m.wallet)
                        .maybeSingle();
                    if (p) setProfiles(prev => ({ ...prev, [p.wallet]: p as Profile }));
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages_public' }, (payload: any) => {
                const removedId = payload.old.id as number;
                setMessages(prev => prev.filter(m => m.id !== removedId));
            })
            .subscribe();

        return () => { ch.unsubscribe(); };
    }, []);

    const system = (text: string) => {
        setMessages(prev => [
            ...prev,
            { id: Date.now(), created_at: new Date().toISOString(), wallet: null, nickname: 'system', text } as any,
        ]);
    };

    const tryHandleCommand = async (raw: string): Promise<boolean> => {
        const s = raw.trim();
        if (!s.startsWith('/')) return false;
        const [cmd, ...rest] = s.slice(1).split(/\s+/);
        const argstr = rest.join(' ');

        switch (cmd.toLowerCase()) {
            case 'help':
                setHelpOpen(h => !h);
                return true;
            case 'dm': {
                const [to] = argstr.split(/\s+/);
                if (to) onStartDM(to);
                return true;
            }
            case 'nick': {
                const newNick = argstr.trim();
                if (!my || !newNick) return true;

                const { data: exist } = await supabase
                    .from('profiles')
                    .select('wallet')
                    .ilike('nickname', newNick)
                    .neq('wallet', my)
                    .maybeSingle();
                if (exist?.wallet) {
                    system(`Nickname "${newNick}" is already taken`);
                    return true;
                }

                const { error } = await supabase.from('profiles').upsert({ wallet: my, nickname: newNick });
                system(error ? `Save failed: ${error.message}` : `Nickname saved: ${newNick}`);
                return true;
            }
            case 'color': {
                if (!my) { system('Connect wallet to set color'); return true; }
                const c = normalizeHex(argstr.trim()).toUpperCase();
                if (!isHexColor(c)) { system('Wrong color. Use HEX like #FFA07A'); return true; }
                const { error } = await supabase.from('profiles').upsert({ wallet: my, color: c });
                if (!error) {
                    setProfiles(prev => ({ ...prev, [my]: { wallet: my, nickname: prev[my]?.nickname ?? null, color: c } }));
                    system(`Color saved: ${c} (visible to everyone)`);
                } else {
                    system(`Save failed: ${error.message}`);
                }
                return true;
            }
            default:
                system(`Unknown command: /${cmd}. Try /help`);
                return true;
        }
    };

    const send = async () => {
        const t = text.trim();
        if (!t) return;

        if (await tryHandleCommand(t)) { setText(''); return; }

        if (my) {
            const { data } = await supabase.from('moderation').select('muted_until,banned_until').eq('wallet', my).maybeSingle();
            const now = Date.now();
            const muted = data?.muted_until && now < Date.parse(data.muted_until);
            const banned = data?.banned_until && now < Date.parse(data.banned_until);
            if (banned) { setText(''); alert('You are banned.'); return; }
            if (muted)  { setText(''); alert('You are muted.'); return; }
        }

        const displayNick = my
            ? (await supabase.from('profiles').select('nickname').eq('wallet', my).maybeSingle()).data?.nickname ?? my
            : guest;                                    // <—

        await supabase.from('messages_public').insert({ wallet: my, nickname: displayNick, text: t });
        setText('');
        setTimeout(scrollBottom, 0);
    };

    return (
        <div className="panel">
            <div className="panel-head">
                <div className="panel-title">Public chat</div>
                <div className="muted">Everyone can see your messages</div>
            </div>

            {helpOpen && (
                <div className="msg" style={{ borderStyle: 'dashed' }}>
                    <div className="msg-text">
                        <b>Commands</b><br/>
                        <code>/help</code> — show/hide this help<br/>
                        <code>/dm @nick</code> — open DM with @nick (or wallet)<br/>
                        <code>/nick NewNick</code> — change your nickname<br/>
                        <code>/color #RRGGBB</code> — change your nickname color
                    </div>
                </div>
            )}

            <div className="list">
                {messages.map(m => {
                    const color = m.wallet ? profiles[m.wallet]?.color ?? undefined : undefined;
                    const name = m.nickname?.trim()
                        ? (looksLikeWallet(m.nickname) ? shortAddr(m.nickname) : m.nickname)
                        : (m.wallet ? shortAddr(m.wallet) : 'guest');

                    return (
                        <div key={m.id} className="msg">
                            <div className="msg-meta">
                                {new Date(m.created_at).toLocaleTimeString()} —{' '}
                                <button
                                    className="link"
                                    style={{ color }}
                                    onClick={() => onStartDM(m.nickname || m.wallet || '')}
                                >
                                    {name}
                                </button>
                                {canDeletePublic(m) && (
                                    <button className="link" onClick={() => deletePublic(m.id)} style={{ marginLeft: 8 }}>
                                        delete
                                    </button>
                                )}
                            </div>
                            <div className="msg-text">{m.text}</div>
                        </div>
                    );
                })}
                <div ref={listEndRef} />
            </div>

            <div className="row input-row">
                <input
                    className="input grow"
                    placeholder="Write a message…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <button className="btn" onClick={send}>Send</button>
            </div>
        </div>
    );
}
