import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabase';
import { normalizeNick, validateNick, isUniqueViolation } from '../lib/helpers';

export default function Identity() {
    const wallet = useWallet();
    const [nickname, setNickname] = useState('');
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState<string>('');

    const walletKey = wallet.publicKey?.toBase58() ?? null;

    useEffect(() => {
        if (!walletKey) return;
        supabase.from('profiles').select('*').eq('wallet', walletKey).maybeSingle()
            .then(({ data }) => setNickname(data?.nickname ?? ''));
    }, [walletKey]);

    const canChange = !!walletKey;

    const save = async () => {
        if (!walletKey) return;
        const newNick = normalizeNick(nickname);
        if (!validateNick(newNick)) {
            setToast('Nickname must be 2–24 chars: letters, digits, space, . _ -');
            setTimeout(() => setToast(''), 2200);
            return;
        }

        const { data: exist } = await supabase
            .from('profiles').select('wallet')
            .ilike('nickname', newNick).neq('wallet', walletKey).maybeSingle();

        if (exist?.wallet) {
            setToast(`Nickname "${newNick}" is already taken`);
            setTimeout(() => setToast(''), 2200);
            return;
        }

        const { error } = await supabase.from('profiles').upsert({ wallet: walletKey, nickname: newNick });

        if (isUniqueViolation(error)) setToast(`Nickname "${newNick}" is already taken`);
        else if (error)             setToast(error.message || 'Save failed');
        else                        setToast('Nickname saved');

        setTimeout(() => setToast(''), 2200);
    };

    return (
        <section className="card crt">
            <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
                <div>
                    <h3 className="section-title" style={{ marginBottom:4 }}>YOUR ACCOUNT</h3>
                    <p className="muted" style={{ margin:0 }}>If no wallet is connected — you are a guest.</p>
                </div>
                <button className={`chev ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} />
            </div>

            {open && (
                <>
                    <div className="kv">
                        <div className="k">Wallet</div><div className="v">{walletKey ?? '—'}</div>
                        <div className="k">Name</div><div className="v">{nickname || '(no nickname)'}</div>
                    </div>

                    <div className="row" style={{ marginTop: 10 }}>
                        <input className="input grow" placeholder="New nickname"
                               value={nickname} onChange={(e) => setNickname(e.target.value)} disabled={!canChange}/>
                        <button className="btn" onClick={save} disabled={!canChange}>Save nickname</button>
                        {toast && <span className="muted" style={{ fontWeight:800 }}>{toast}</span>}
                    </div>
                </>
            )}
        </section>
    );
}
