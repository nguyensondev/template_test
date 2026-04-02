# AI Chat Application

A full-stack chat application built with React + Vite (frontend) and Node.js + Express (backend), supporting multiple AI models including Groq and Google Gemini.

## Features

- 💬 Real-time chat with AI models
- 🤖 Multiple AI model support (Built-in, Groq Llama 4 Scout, Google Gemini)
- 📎 File & image upload (up to 3 files, 10MB each)
- 🖼️ Image analysis via Groq and Gemini
- 📝 Multiline input (Shift+Enter for new line)
- 💾 Chat history with MongoDB (fallback to in-memory if unavailable)
- 🗑️ Clear chat history

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 5, Axios, Lucide React |
| Backend | Node.js, Express, Mongoose, Multer |
| Database | MongoDB (optional — in-memory fallback) |
| AI Models | Google Gemini 2.0 Flash Lite, Groq Llama 4 Scout, Built-in |

## Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (optional — the app works without it using in-memory storage)

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd Template_Test
```

### 2. Install dependencies

```bash
# Root dependencies (concurrently)
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install

# Go back to root
cd ..
```

### 3. Set up environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb://127.0.0.1:27017/chatbot
PORT=5001
```

> **Note:** All API keys are optional. Without them, the app uses the built-in AI responses.

**Get free API keys:**
- **Groq:** [console.groq.com](https://console.groq.com/) — Free tier with generous limits
- **Gemini:** [ai.google.dev](https://ai.google.dev/) — Free tier available

### 4. Run the application

```bash
npm start
```

This starts both:
- **Backend** → http://localhost:5001
- **Frontend** → http://localhost:3000

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Alternative: Run server and client separately

```bash
# Terminal 1 — Server
cd server && node index.js

# Terminal 2 — Client
cd client && npm run dev
```

## Project Structure

```
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx           # Main chat component
│   │   ├── App.css           # Component styles
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Global styles
│   ├── index.html            # HTML template
│   ├── vite.config.js        # Vite configuration
│   └── package.json
├── server/                   # Express backend
│   ├── models/
│   │   └── Message.js        # Mongoose message schema
│   ├── index.js              # API routes & AI integration
│   ├── .env.example          # Environment template
│   └── package.json
├── .gitignore
├── package.json              # Root scripts (concurrently)
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat` | Get chat history |
| `POST` | `/api/chat` | Send prompt & get AI response |
| `POST` | `/api/upload` | Upload files (max 3, 10MB each) |
| `DELETE` | `/api/chat` | Clear chat history |
| `GET` | `/api/models` | List available AI models |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `MongoDB not available` warning | This is normal if MongoDB isn't installed. The app uses in-memory storage. |
| Port 5001 already in use | Change `PORT` in `server/.env` |
| Port 3000 already in use | Change `server.port` in `client/vite.config.js` |
| Gemini/Groq API errors | Check your API keys in `server/.env` |
