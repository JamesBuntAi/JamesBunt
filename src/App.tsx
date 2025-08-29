import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import '@solana/wallet-adapter-react-ui/styles.css'

import WalletFab from './components/WalletFab'
import Hero from './components/Hero'
import Identity from './components/Identity'
import ChatPanel from './components/ChatPanel'

function Shell() {
    const endpoint = useMemo(() => 'https://rpc.ankr.com/solana', [])
    const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletFab />
                    <main className="container">
                        <Hero />
                        <Identity />
                        <ChatPanel />
                    </main>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}

export default function App() {
    return <Shell />
}
