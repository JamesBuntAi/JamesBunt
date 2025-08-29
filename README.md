# James Bunt AI

A modern AI-powered chat application built with React, TypeScript, and integrated with Solana blockchain wallet functionality.

![James Bunt AI](https://jamesbunt-ai.fun/logo.jpg)

## 🌟 Features

- 🤖 **AI Chat Interface** - Interactive chat with AI using OpenRouter API
- 💬 **Public & Private Messaging** - Community chat and private DMs
- 🔐 **Solana Wallet Integration** - Connect with Phantom and other Solana wallets
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🔄 **Real-time Updates** - Live message updates using Supabase realtime
- 👤 **User Profiles** - Custom nicknames and identity management
- 🎨 **Modern UI** - Clean, intuitive interface

## 🚀 Demo

**Live Site**: [https://jamesbunt-ai.fun](https://jamesbunt-ai.fun)

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: CSS with custom design system
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Solana Web3.js
- **AI**: OpenRouter API
- **Deployment**: Netlify

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- OpenRouter API account
- Solana wallet (for admin features)

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/JamesBuntAi/JamesBunt.git
   cd JamesBunt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your actual values:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
   VITE_OPENROUTER_MODEL=openrouter/auto
   VITE_ADMIN_WALLET=your_admin_solana_wallet_address_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🗄️ Database Setup

Create the following tables in your Supabase dashboard:

```sql
-- Messages table for public chat
CREATE TABLE messages_public (
  id BIGSERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  nickname TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Private messages table
CREATE TABLE messages_private (
  id BIGSERIAL PRIMARY KEY,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User identities table
CREATE TABLE user_identities (
  wallet TEXT PRIMARY KEY,
  nickname TEXT,
  twitter TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Enable Row Level Security (RLS) and set up appropriate policies for your use case.

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── AiChat.tsx      # AI chat interface
│   ├── PublicChat.tsx  # Public messaging
│   ├── PrivateChat.tsx # Private messaging
│   ├── Identity.tsx    # User profile management
│   ├── Hero.tsx        # Landing page hero
│   ├── WalletFab.tsx   # Wallet connection button
│   └── AdminPanel.tsx  # Admin functionality
├── lib/                # Utility functions
│   ├── supabase.ts     # Supabase client
│   ├── types.ts        # TypeScript types
│   └── helpers.ts      # Helper functions
├── config.ts           # Configuration constants
└── main.tsx           # Application entry point
```

## 🚀 Deployment

This project is configured for deployment on Netlify with the included `netlify.toml` file.

### Build for production
```bash
npm run build
```

### Deploy to Netlify
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

- Never commit your `.env` file
- Keep your API keys secure
- Use environment variables for all sensitive data
- The `.env.example` file shows required variables without exposing actual values

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 💬 Support

For support, please:
- Open an issue in this repository
- Visit our live chat at [https://jamesbunt-ai.fun](https://jamesbunt-ai.fun)
- Contact the development team

---

**Built with ❤️ by the James Bunt AI team**
