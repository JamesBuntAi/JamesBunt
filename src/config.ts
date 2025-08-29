export const ADMIN_WALLET =
    ((import.meta as any).env?.VITE_ADMIN_WALLET as string | undefined)?.trim() || '';

export const RPC_ENDPOINT = 'https://rpc.ankr.com/solana';
