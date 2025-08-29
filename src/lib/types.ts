export type PubMsg = {
    id: number
    created_at: string
    wallet: string | null
    nickname: string | null
    text: string
}

export type PmMsg = {
    id: number
    created_at: string
    from_wallet: string
    to_wallet: string
    text: string
}

export type Profile = {
    wallet: string
    nickname: string | null
    color: string | null
}

export type AiMsg = { from: 'User' | 'AI'; text: string }

export type PeerInfo = { wallet: string; nickname?: string | null; last_at?: string }
