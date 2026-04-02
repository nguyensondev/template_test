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

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (optional — the app works without it using in-memory storage)

### 1. Install dependencies

```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install

# Go back to root
cd ..
```

### 2. Set up environment variables

Copy the `.env` file (đính kèm trong email nộp bài) vào thư mục `server/`:

```bash
cp /path/to/downloaded/.env server/.env
```

Hoặc tạo file `server/.env` thủ công rồi paste nội dung từ file đính kèm vào.

> **Note:** App vẫn chạy được khi không có API keys (sử dụng built-in AI). MongoDB cũng là optional — nếu không có, chat history sẽ lưu trong memory.

### 3. Run the application

```bash
npm start
```

This starts both:
- **Backend** → http://localhost:5001
- **Frontend** → http://localhost:3000

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Alternative: Run separately

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
| `MongoDB not available` warning | This is normal if MongoDB isn't installed. The app uses in-memory storage instead. |
| Port 5001 already in use | Change `PORT` in `server/.env` |
| Port 3000 already in use | Change `server.port` in `client/vite.config.js` |
| Gemini/Groq API errors | Verify your API keys in `server/.env` |
