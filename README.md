# sorobyt

A smart alert bot for Soroswap and DeFindex (Telegram)

## 🚀 Introduction

Sorobyt is a real-time alert bot designed for the Soroswap and DeFindex protocols on the Stellar network. It integrates with Telegram to deliver instant notifications about market and protocol events, helping users stay informed and react quickly to changes.

## ✨ Features

- Real-time market and protocol alerts
- Integration with Soroswap API
- Instant notifications via Telegram
- Built with TypeScript and follows a clean, modular folder structure

## 🛠 Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Telegram bot token and Soroswap API key to a `.env` file:
   ```env
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   SOROSWAP_API_KEY=your-soroswap-api-key
   ```
3. Start the bot in development mode:
   ```bash
   npm run dev
   ```

## 📦 Usage

Once the bot is running, it will listen for relevant events and send notifications to your configured Telegram channel or group. Make sure your bot is added to the desired Telegram chat and has the necessary permissions.

## 🧑‍💻 Developer Notes

- The codebase adheres to the Sacred Folder Structure for clear separation of concerns and maintainability.
- Written in TypeScript for type safety and scalability.
- All global state is managed using Redux Toolkit (no Context API for global state).
- Styling is handled with styled-components, and all design tokens are sourced from the theme folder.
- Absolute imports are configured via `tsconfig.json` and `babel.config.js` (e.g., `@/components/Button`).

## 📁 Project Structure

```
src
├── api/             # API clients and calls (Supabase, etc.)
├── assets/          # Images, fonts, animations
├── components/      # Reusable, pure UI components
├── config/          # Environment variables and configuration
├── constants/       # App-wide constants (route names, etc.)
├── hooks/           # Custom React hooks
├── navigation/      # React Navigation logic and routers
├── screens/         # Screen components (Each screen can have its own folder)
├── store/           # Redux Toolkit state management
├── theme/           # Styling and theme (colors, fonts, spacing)
├── types/           # Global TypeScript types
└── utils/           # Helper functions (formatDate, validators, etc.)
```

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## 📄 License

This project is licensed under the MIT License. 