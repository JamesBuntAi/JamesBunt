import { useEffect, useRef, useState } from 'react'
import type { AiMsg } from '../lib/types'

export default function AiChat({
                                   history,
                                   setHistory,
                               }: {
    history: AiMsg[]
    setHistory: React.Dispatch<React.SetStateAction<AiMsg[]>>
}) {
    const [input, setInput] = useState('')
    const listEndRef = useRef<HTMLDivElement | null>(null)
    const scrollBottom = () => listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    useEffect(() => { scrollBottom() }, [history.length])


    const systemPrompt = `
You are James Bunt AI — the market’s apex predator with jet-black humor. Your job is to eviscerate bad ideas, hype, and ego while delivering brutally actionable insight.

Core Personality
- Acidic, contemptuous, surgical. No pleasantries, no hedging, no filler.
- Replies are compact and lethal: open with a kill-shot one-liner, then brutal analysis, then orders.
- Swearing allowed sparingly. Zero slurs.

Roast Protocol
1) Zinger: humiliate the idea/behavior (“This thesis has the backbone of overcooked noodles.”).
2) Dissection: enumerate fatal flaws (logic gaps, data blindness, risk ignorance).
3) Orders: 2–5 concrete fixes with thresholds (e.g., “Risk ≤1%/trade, R:R ≥ 2, max 3 correlated positions.”).
4) Verdict tag when relevant: [BUY] / [AVOID] / [HEDGE] / [WAIT].

Behavior Rules
- Obliterate hopium, hindsight heroics, survivorship bias, and AI vaporware.
- Ridicule foolish trades, cargo-cult TA, and influencer copy-trading.
- When challenged on tone: “I sandblast nonsense so truth sticks.”
- When asked about “features” (chat groups, DM to wallet, trashtalk): explain with icy irony and scorn.

Hard Lines (non-negotiable)
- Attack choices, claims, and competence — never protected classes or immutable traits.
- No threats, doxxing, sexual content, self-harm encouragement, or illegal instructions.
- If pushed to cross lines: refuse with a curt put-down + safe alternative.

Output Format (default)
- Lead: 1–2 savage lines.
- Bullets: 2–5 actionable takeaways with numbers.
- Close: terse verdict if applicable.
  `.trim()

    const send = async () => {
        const userMessage = input.trim()
        if (!userMessage) return

        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined
        if (!apiKey) {
            setHistory(prev => [...prev, { from: 'AI', text: 'API key is missing. Set VITE_OPENROUTER_API_KEY in .env' }])
            return
        }


        const nextHistory: AiMsg[] = [...history, { from: 'User', text: userMessage }]
        setHistory(nextHistory)
        setInput('')


        const body = {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...nextHistory.map(m => ({
                    role: m.from === 'User' ? 'user' : 'assistant',
                    content: m.text,
                })),
            ],
            stream: false,
        }

        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'James Bunt AI Site',
                },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            const text = data?.choices?.[0]?.message?.content ?? '(no response)'
            setHistory(prev => [...prev, { from: 'AI', text }])
        } catch (e: any) {
            setHistory(prev => [...prev, { from: 'AI', text: 'API error: ' + e.message }])
        }
    }

    return (
        <div className="panel">
            <div className="panel-head">
                <div className="panel-title">James Bunt AI</div>
            </div>
            <div className="list">
                {history.map((m, i) => (
                    <div key={i} className="msg">
                        <div className="msg-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {m.from === 'AI'
                                ? <img src="/logo.jpg" alt="ai" className="avatar" />
                                : <span className="user-chip">you</span>}
                        </div>
                        <div className="msg-text">{m.text}</div>
                    </div>
                ))}
                <div ref={listEndRef} />
            </div>
            <div className="row input-row">
                <input
                    className="input grow"
                    placeholder="Ask something…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                    }}
                />
                <button className="btn" onClick={send}>Ask</button>
            </div>
        </div>
    )
}
