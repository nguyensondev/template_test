const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const Message = require('./models/Message');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

app.use('/uploads', express.static(uploadDir));

// DB
let dbReady = false;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatbot';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => { console.log('MongoDB connected'); dbReady = true; })
  .catch(() => { console.log('MongoDB not available, using in-memory storage'); });

let memoryStore = [];

// ==================== AI Model Setup ====================

// --- Gemini ---
let geminiModel = null;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    console.log('Gemini API configured (gemini-2.0-flash-lite)');
  } catch (err) {
    console.log('Failed to init Gemini:', err.message);
  }
}

// --- Groq (FREE - supports vision!) ---
let groqClient = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
if (GROQ_API_KEY) {
  try {
    const Groq = require('groq-sdk');
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
    console.log('Groq API configured (llama-4-scout-17b)');
  } catch (err) {
    console.log('Failed to init Groq:', err.message);
  }
}

// Helper: convert file to base64 data URL for Groq
function fileToBase64DataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  const mimeType = mimeMap[ext] || 'image/jpeg';
  const base64 = Buffer.from(fs.readFileSync(filePath)).toString('base64');
  return { base64, mimeType, dataUrl: `data:${mimeType};base64,${base64}` };
}

// Helper: convert file to Gemini inlineData part
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType
    }
  };
}

// available models list
const MODELS = [
  { id: 'built-in', name: 'Built-in AI', description: 'Simple built-in responses (always available)', available: true },
  { id: 'groq', name: 'Groq Llama 4 Scout', description: 'Free Groq API - supports image analysis!', available: !!groqClient },
  { id: 'gemini', name: 'Gemini 2.0 Flash Lite', description: 'Google Gemini (may have quota limits)', available: !!geminiModel },
];

// GET /api/models
app.get('/api/models', (req, res) => {
  res.json(MODELS);
});

// GET /api/chat
app.get('/api/chat', async (req, res) => {
  try {
    if (dbReady) {
      const msgs = await Message.find().sort({ timestamp: 1 });
      return res.json(msgs);
    }
    res.json(memoryStore);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ==================== Generate AI Response ====================

async function generateGroqResponse(prompt, imageUrls) {
  const contentParts = [];

  // Add text
  contentParts.push({ type: 'text', text: prompt });

  // Add images if any
  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      const filename = url.split('/').pop();
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        const { dataUrl } = fileToBase64DataUrl(filePath);
        contentParts.push({
          type: 'image_url',
          image_url: { url: dataUrl }
        });
      }
    }
  }

  // llama-4-scout supports both text and vision (multimodal)
  const modelId = 'meta-llama/llama-4-scout-17b-16e-instruct';

  const completion = await groqClient.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: 'user',
        content: contentParts
      }
    ],
    max_tokens: 2048,
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
}

async function generateGeminiResponse(prompt, imageUrls) {
  const parts = [prompt];

  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      const filename = url.split('/').pop();
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
        const mimeType = mimeMap[ext] || 'image/jpeg';
        parts.push(fileToGenerativePart(filePath, mimeType));
      }
    }
  }

  const result = await geminiModel.generateContent(parts);
  return result.response.text();
}

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, model, imageUrls } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const selectedModel = model || 'built-in';
    let aiContent;

    if (selectedModel === 'groq' && groqClient) {
      try {
        aiContent = await generateGroqResponse(prompt, imageUrls);
      } catch (err) {
        console.error('Groq error:', err.message);
        aiContent = 'Groq API error: ' + err.message;
      }
    } else if (selectedModel === 'gemini' && geminiModel) {
      try {
        aiContent = await generateGeminiResponse(prompt, imageUrls);
      } catch (err) {
        console.error('Gemini error:', err.message);
        aiContent = 'Gemini API error: ' + err.message;
      }
    } else {
      if (imageUrls && imageUrls.length > 0) {
        aiContent = 'I can see you sent image(s), but the built-in AI cannot process images. Please switch to Groq or Gemini model for image analysis.';
      } else {
        aiContent = generateBuiltInResponse(prompt);
      }
    }

    const userMsg = {
      role: 'user',
      content: prompt,
      model: selectedModel,
      imageUrls: imageUrls || [],
      timestamp: new Date()
    };
    const aiMsg = { role: 'ai', content: aiContent, model: selectedModel, timestamp: new Date() };

    if (dbReady) {
      await Message.create(userMsg);
      await Message.create(aiMsg);
    } else {
      memoryStore.push(userMsg, aiMsg);
    }

    res.json({ response: aiContent, model: selectedModel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// POST /api/upload - supports multiple files (max 3)
app.post('/api/upload', upload.array('files', 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const fileUrls = req.files.map(f => `http://localhost:${port}/uploads/${f.filename}`);

    // Save file upload messages to DB
    for (const f of req.files) {
      const systemMsg = {
        role: 'system',
        content: `File uploaded: ${f.originalname}`,
        fileUrl: `http://localhost:${port}/uploads/${f.filename}`,
        timestamp: new Date()
      };
      if (dbReady) {
        await Message.create(systemMsg);
      } else {
        memoryStore.push(systemMsg);
      }
    }

    res.json({ fileUrls });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB per file.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 3 files at once.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// DELETE /api/chat
app.delete('/api/chat', async (req, res) => {
  try {
    if (dbReady) {
      await Message.deleteMany({});
    } else {
      memoryStore = [];
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

function generateBuiltInResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi')) {
    return "Hello! How can I help you today?";
  }
  if (lower.includes('how are you')) {
    return "I'm doing great, thanks for asking! How about you?";
  }
  if (lower.includes('what can you do')) {
    return "I can answer questions, help with writing, analyze data, and much more. Just ask me anything!";
  }
  if (lower.includes('bye') || lower.includes('goodbye')) {
    return "Goodbye! Have a great day!";
  }
  if (lower.includes('help')) {
    return "Sure! I'm here to help. What do you need assistance with?";
  }
  return `Thank you for your message. Here's my response to: "${prompt}"\n\nI'm an AI assistant ready to help you with various tasks. Feel free to ask me anything!`;
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Gemini: ${geminiModel ? 'enabled' : 'disabled (set GEMINI_API_KEY in .env)'}`);
  console.log(`Groq:   ${groqClient ? 'enabled' : 'disabled (set GROQ_API_KEY in .env)'}`);
});
