import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Plus, Loader2, Sparkles, Trash2, Paperclip, ChevronDown, X, FileIcon } from 'lucide-react';
import './App.css';

const API = 'http://localhost:5001/api';
const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('built-in');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // { file, preview, isImage, id }
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadHistory();
    loadModels();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
    };
  }, []);

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/chat`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  const loadModels = async () => {
    try {
      const res = await axios.get(`${API}/models`);
      setModels(res.data);
    } catch (err) {
      console.error('Failed to load models', err);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || loading) return;

    const currentFiles = [...pendingFiles];
    const hasImages = currentFiles.some(f => f.isImage);
    const prompt = text || (hasImages ? 'Describe the image(s)' : 'I uploaded file(s)');

    // Show user message immediately with previews
    const userMsg = {
      role: 'user',
      content: text,
      imageUrls: currentFiles.filter(f => f.isImage).map(f => f.preview),
      fileNames: currentFiles.filter(f => !f.isImage).map(f => f.file.name),
      _localPreviews: true
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingFiles([]);
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      // Upload files first if any
      let uploadedUrls = [];
      if (currentFiles.length > 0) {
        setUploadingFile(true);
        const formData = new FormData();
        currentFiles.forEach(f => formData.append('files', f.file));

        const uploadRes = await axios.post(`${API}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrls = uploadRes.data.fileUrls;
        setUploadingFile(false);

        // Update user message with server URLs
        const imageUrls = uploadedUrls.filter(u => /\.(jpg|jpeg|png|gif|webp)$/i.test(u));
        setMessages(prev => prev.map((msg, i) =>
          i === prev.length - 1 && msg._localPreviews
            ? { ...msg, imageUrls: imageUrls.length > 0 ? imageUrls : msg.imageUrls, _localPreviews: false }
            : msg
        ));
      }

      // Send chat with file URLs
      const res = await axios.post(`${API}/chat`, {
        prompt,
        model: selectedModel,
        imageUrls: uploadedUrls.filter(u => /\.(jpg|jpeg|png|gif|webp)$/i.test(u))
      });
      setMessages(prev => [...prev, { role: 'ai', content: res.data.response, model: res.data.model }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      setUploadingFile(false);
      // Cleanup preview URLs
      currentFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_FILES - pendingFiles.length;
    if (remaining <= 0) {
      alert(`Maximum ${MAX_FILES} files allowed at once.`);
      e.target.value = '';
      return;
    }

    const toAdd = files.slice(0, remaining);
    const errors = [];

    const validFiles = toAdd.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" exceeds 10MB limit.`);
        return false;
      }
      return true;
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (files.length > remaining) {
      alert(`Only ${remaining} more file(s) can be added. (Max ${MAX_FILES})`);
    }

    const newFiles = validFiles.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
        isImage,
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      };
    });

    setPendingFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removePendingFile = (id) => {
    setPendingFiles(prev => {
      const f = prev.find(i => i.id === id);
      if (f && f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API}/chat`);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear', err);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getModelLabel = () => {
    const m = models.find(m => m.id === selectedModel);
    return m ? m.name : 'Built-in AI';
  };

  return (
    <div className="app">
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
            <Sparkles size={20} />
            <span>AI Assistant</span>
          </div>
          <button className="clear-btn" onClick={clearHistory} title="Clear chat">
            <Trash2 size={18} />
          </button>
        </header>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <Sparkles size={40} />
              <h2>How can I help you today?</h2>
              <p>Send a message or attach images to start a conversation.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`}>
              {msg.role === 'ai' && <div className="avatar ai-avatar">AI</div>}
              <div className={`msg-bubble ${msg.role}`}>
                {/* Image attachments */}
                {msg.imageUrls && msg.imageUrls.length > 0 && (
                  <div className="msg-images">
                    {msg.imageUrls.map((url, idx) => (
                      <div key={idx} className="msg-image-wrapper">
                        <img
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="msg-image"
                          onClick={() => window.open(url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {msg.fileNames && msg.fileNames.length > 0 && (
                  <div className="msg-file-list">
                    {msg.fileNames.map((name, idx) => (
                      <div key={idx} className="msg-file-item">
                        <Paperclip size={14} />
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {msg.content && <div className="msg-content">{msg.content}</div>}
                {/* Legacy single file link */}
                {msg.fileUrl && (
                  <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="file-link">
                    <Paperclip size={14} /> View file
                  </a>
                )}
                <div className="msg-meta">
                  {msg.model && <span className="msg-model">{msg.model}</span>}
                  {msg.timestamp && <span className="msg-time">{formatTime(msg.timestamp)}</span>}
                </div>
              </div>
              {msg.role === 'user' && <div className="avatar user-avatar">You</div>}
            </div>
          ))}

          {loading && (
            <div className="msg-row ai">
              <div className="avatar ai-avatar">AI</div>
              <div className="msg-bubble ai typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Pending file previews */}
        {pendingFiles.length > 0 && (
          <div className="pending-images-bar">
            <div className="pending-images-scroll">
              {pendingFiles.map((item) => (
                <div key={item.id} className="pending-image-item">
                  {item.isImage ? (
                    <img src={item.preview} alt="Preview" className="pending-image-thumb" />
                  ) : (
                    <div className="pending-file-thumb">
                      <FileIcon size={24} />
                      <span className="pending-file-name">{item.file.name}</span>
                    </div>
                  )}
                  <button
                    className="pending-image-remove"
                    onClick={() => removePendingFile(item.id)}
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {pendingFiles.length < MAX_FILES && (
                <button
                  className="pending-image-add"
                  onClick={() => fileInputRef.current?.click()}
                  title="Add more files"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className="pending-images-info">
              {pendingFiles.length}/{MAX_FILES} files
            </div>
          </div>
        )}

        <div className="chat-input-area">
          <div className="input-bar">
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile || pendingFiles.length >= MAX_FILES}
              title={pendingFiles.length >= MAX_FILES ? `Maximum ${MAX_FILES} files` : 'Upload files'}
            >
              {uploadingFile ? <Loader2 size={20} className="spin" /> : <Plus size={20} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
              onChange={handleFileSelect}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={pendingFiles.length > 0 ? 'Add a message about these files...' : 'Type your message...'}
              rows={1}
            />
            <button
              className="model-selector-btn"
              onClick={() => setShowModelPicker(!showModelPicker)}
              title="Select AI model"
            >
              {getModelLabel()} <ChevronDown size={14} />
            </button>
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={loading || (!input.trim() && pendingFiles.length === 0)}
            >
              <Sparkles size={16} />
              <span>Generate Free</span>
            </button>
          </div>
        </div>
      </div>

      {/* Model picker modal */}
      {showModelPicker && (
        <div className="modal-overlay" onClick={() => setShowModelPicker(false)}>
          <div className="model-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select AI Model</h3>
              <button className="modal-close" onClick={() => setShowModelPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="model-list">
              {models.map((m) => (
                <button
                  key={m.id}
                  className={`model-item ${selectedModel === m.id ? 'active' : ''} ${!m.available ? 'disabled' : ''}`}
                  onClick={() => {
                    if (m.available) {
                      setSelectedModel(m.id);
                      setShowModelPicker(false);
                    }
                  }}
                  disabled={!m.available}
                >
                  <div className="model-info">
                    <span className="model-name">{m.name}</span>
                    <span className="model-desc">{m.description}</span>
                  </div>
                  {!m.available && <span className="model-badge">API key required</span>}
                  {selectedModel === m.id && <span className="model-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <p>Add API keys to <code>server/.env</code>:</p>
              <p><code>GROQ_API_KEY</code> — Free at <a href="https://console.groq.com/" target="_blank" rel="noreferrer">console.groq.com</a></p>
              <p><code>GEMINI_API_KEY</code> — Free at <a href="https://ai.google.dev/" target="_blank" rel="noreferrer">ai.google.dev</a></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
