import { useState } from 'react';
import { supabase } from './supabase';

export const ADMIN_WALLET = (import.meta.env.VITE_ADMIN_WALLET as string | undefined)?.trim();

export function useGuestId() {
    const [id] = useState(() => Math.random().toString(36).slice(2, 6));
    return `guest-${id}`;
}

export const shortAddr = (a: string, l = 4, r = 4) =>
    a?.length > l + r ? `${a.slice(0, l)}…${a.slice(-r)}` : a;

export const looksLikeWallet = (s: string) =>
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

export const normalizeHex = (s: string) =>
    s.trim()
        .replace(/＃/g, '#')
        .replace(/\u0410/g, 'A').replace(/\u0430/g, 'a')
        .replace(/\u0412/g, 'B').replace(/\u0432/g, 'b')
        .replace(/\u0421/g, 'C').replace(/\u0441/g, 'c')
        .replace(/\u0415/g, 'E').replace(/\u0435/g, 'e')
        .replace(/\u0424/g, 'F').replace(/\u0444/g, 'f');

export const isHexColor = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(normalizeHex(s));

export async function resolveHandleToWallet(handle: string): Promise<string | null> {
    const h = handle.replace(/^@/, '').trim();
    if (!h) return null;
    if (looksLikeWallet(h)) return h;
    const { data } = await supabase.from('profiles').select('wallet').ilike('nickname', h).limit(1);
    return data && data[0]?.wallet ? data[0].wallet : null;
}

export async function nicknameIsFree(nick: string, myWallet: string) {
    const { data } = await supabase
        .from('profiles').select('wallet')
        .ilike('nickname', nick).neq('wallet', myWallet).limit(1);
    return !(data && data.length);
}

export const normalizeNick = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 24);
export const validateNick = (s: string) => /^[A-Za-z0-9._\- ]{2,24}$/.test(s);

export const isUniqueViolation = (err: any) =>
    !!err && (err.code === '23505' || /unique|duplicate key/i.test(err.message || ''));
