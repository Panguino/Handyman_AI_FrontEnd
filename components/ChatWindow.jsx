'use client';
import { useEffect, useRef, useState } from 'react';
import { getTheme, setTheme } from '@/lib/ui/theme';

import styles from './ChatWindow.module.scss';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [lastError, setLastError] = useState('');
  const fileRef = useRef(null);
  const listRef = useRef(null);

  const [theme, setThemeState] = useState('system');

  async function ensureSession() {
    try {
      const r = await fetch('/api/session');
      if (r.ok) setSessionReady(true);
    } catch {}
  }
  async function requestAssistant(promptText) {
    setBusy(true);
    setLastError('');
    // Show typing bubble immediately
    setMessages((m) => [...m, { sender: 'ASSISTANT', type: 'TYPING' }]);
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: promptText }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Chat error');
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('text/plain')) {
        // True streaming
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let assistant = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistant += chunk;
          setMessages((m) => {
            const copy = m.slice();
            copy[copy.length - 1] = { sender: 'ASSISTANT', type: 'TEXT', text: assistant };
            return copy;
          });
        }
      } else {
        // Fallback to non-streaming JSON, simulate streaming on client
        const data = await resp.json();
        const text = data?.content || '';
        let i = 0;
        while (i < text.length) {
          const next = Math.min(text.length, i + 60);
          const slice = text.slice(i, next);
          i = next;
          await new Promise((r) => setTimeout(r, 20));
          setMessages((m) => {
            const last = m[m.length - 1];
            const copy = m.slice();
            copy[copy.length - 1] = { sender: 'ASSISTANT', type: 'TEXT', text: (last.text || '') + slice };
            return copy;
          });
        }
      }
    } catch (e) {
      setLastError(String(e.message || e));
      // Replace typing bubble with error if present
      setMessages((m) => {
        const copy = m.slice();
        const last = copy[copy.length - 1];
        if (last && last.sender === 'ASSISTANT' && last.type === 'TYPING') {
          copy[copy.length - 1] = { sender: 'ASSISTANT', type: 'TEXT', text: 'Sorry, something went wrong.' };
          return copy;
        }
        return [...m, { sender: 'ASSISTANT', type: 'TEXT', text: 'Sorry, something went wrong.' }];
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // ensure session + conversation exists
    setThemeState(getTheme());
    ensureSession().then(() => {
      // load history once session is ready
      fetch('/api/messages')
        .then((r) => r.json())
        .then((data) => setMessages(data.messages || []))
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function sendText() {
    if (!input.trim()) return;
    if (!sessionReady) {
      await ensureSession();
    }
    const content = input.trim();
    setInput('');
    setMessages((m) => [...m, { sender: 'CUSTOMER', type: 'TEXT', text: content }]);
    setBusy(true);
    setLastError('');
    try {
      await requestAssistant(content);
    } catch (e) {
      setLastError(String(e.message || e));
      setMessages((m) => [...m, { sender: 'ASSISTANT', type: 'TEXT', text: 'Sorry, something went wrong.' }]);
    } finally {
      setBusy(false);
    }
  }

  async function sendQuick(text) {
    if (!text) return;
    if (!sessionReady) {
      await ensureSession();
    }
    setMessages((m) => [...m, { sender: 'CUSTOMER', type: 'TEXT', text }]);
    setBusy(true);
    setLastError('');
    try {
      await requestAssistant(text);
    } catch (e) {
      setLastError(String(e.message || e));
      setMessages((m) => [...m, { sender: 'ASSISTANT', type: 'TEXT', text: 'Sorry, something went wrong.' }]);
    } finally {
      setBusy(false);
    }
  }

  async function resetChat() {
    setBusy(true);
    try {
      await fetch('/api/session/reset', { method: 'POST' });
      setMessages([]);
      await fetch('/api/session');
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file) {
    const fd = new FormData();
    fd.append('file', file);
    const resp = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data?.url) {
      setMessages((m) => [...m, { sender: 'CUSTOMER', type: 'IMAGE', url: data.url }]);
      // Nudge assistant to consider the new image and ask the next best question
      await requestAssistant('I uploaded a photo. Please continue your quick intake questions.');
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <strong>Troutman Handyman AI</strong>
          {lastError ? <span style={{ color: '#b91c1c', marginLeft: 8, fontSize: 12 }}>Error: {lastError}</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.actionButton} onClick={() => sendQuick('Ready to schedule / can I get a recap?')} disabled={busy}>
            Ready to schedule / recap
          </button>
          <button className={styles.actionButton} onClick={() => sendQuick('Could you give me DIY guidance to fix this myself?')} disabled={busy}>
            DIY advice
          </button>
          <button className={styles.actionButton} onClick={resetChat} disabled={busy}>
            Reset
          </button>
          <button
            title={`Theme: ${theme}`}
            className={styles.themeToggle}
            onClick={() => {
              const current = getTheme();
              const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
              setTheme(next);
              setThemeState(next);
            }}
            aria-label='Toggle color theme'
          >
            {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥️'}
          </button>
        </div>
      </div>
      <div className={styles.messages} ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.row} ${m.sender === 'CUSTOMER' ? styles.rowCustomer : styles.rowAssistant}`}>
            <div
              className={`${styles.avatar} ${
                m.sender === 'CUSTOMER' ? styles.avatarYou : m.sender === 'HANDYMAN' ? styles.avatarPro : styles.avatarAI
              }`}
            >
              {m.sender === 'CUSTOMER' ? 'You' : m.sender === 'HANDYMAN' ? '🧰' : 'AI'}
            </div>
            {m.type === 'TEXT' ? (
              m.sender === 'CUSTOMER' ? (
                <div className={styles.user}>{m.text}</div>
              ) : (
                <div className={styles.assistant}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
              )
            ) : m.type === 'TYPING' ? (
              <div className={styles.typing}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            ) : (
              <img className={styles.image} src={m.url} alt='upload' />
            )}
          </div>
        ))}
      </div>
      <div className={styles.composer}>
        <input
          className={styles.input}
          placeholder={busy ? 'Thinking…' : 'Describe your project…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText()}
          disabled={busy}
        />
        <input
          ref={fileRef}
          type='file'
          accept='image/*'
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
        />
        <button className={styles.button} onClick={() => fileRef.current?.click()} disabled={busy}>
          Upload
        </button>
        <button className={styles.button} onClick={sendText} disabled={busy}>
          Send
        </button>
      </div>
      <div className={styles.note}>We’ll only ask for contact info when you’re ready for an estimate or to book.</div>
    </div>
  );
}
