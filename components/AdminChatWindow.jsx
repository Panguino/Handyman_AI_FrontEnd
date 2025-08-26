'use client';
import React, { useEffect, useRef, useState } from 'react';
import styles from './ChatWindow.module.scss';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { baseUrl } from '@/lib/utils/env';

const HANDYMAN_NAME = process.env.NEXT_PUBLIC_HANDYMAN_NAME || 'Handyman';
const HANDYMAN_INITIALS = HANDYMAN_NAME.split(' ')
  .filter(Boolean)
  .map((w) => w[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

export default function AdminChatWindow({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [conversationId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (autoScroll || busy) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, autoScroll, busy]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    setAutoScroll(nearBottom);
  }

  async function refresh() {
    const res = await fetch(`/api/messages?conversationId=${conversationId}`, { cache: 'no-store' });
    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function sendHandyman() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { sender: 'HANDYMAN', type: 'TEXT', text }]);
    setAutoScroll(true);
    setBusy(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sender: 'HANDYMAN', conversationId }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function askAI() {
    setAutoScroll(true);
    setBusy(true);
    setMessages((m) => [...m, { sender: 'ASSISTANT', type: 'TYPING' }]);
    try {
      const res = await fetch('/api/chat/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      if (res.headers.get('content-type')?.includes('text/plain')) {
        const reader = res.body.getReader();
        let assistant = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          assistant += chunk;
          setMessages((m) => {
            const copy = m.slice();
            copy[copy.length - 1] = { sender: 'ASSISTANT', type: 'TEXT', text: assistant };
            return copy;
          });
        }
      } else {
        const data = await res.json();
        const assistant = data.content || '';
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { sender: 'ASSISTANT', type: 'TEXT', text: assistant };
          return copy;
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <strong>Conversation {conversationId.slice(0, 8)}…</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.actionButton} onClick={askAI} disabled={busy}>
            Ask AI
          </button>
        </div>
      </div>
      <div className={styles.messages} ref={listRef} onScroll={handleScroll}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.row} ${m.sender === 'HANDYMAN' ? styles.rowCustomer : styles.rowAssistant}`}>
            <div className={styles.avatarWrap}>
              <div
                className={`${styles.avatar} ${
                  m.sender === 'HANDYMAN' ? styles.avatarPro : m.sender === 'CUSTOMER' ? styles.avatarCustomer : styles.avatarAI
                }`}
              >
                {m.sender === 'HANDYMAN' ? 'You' : m.customerInitials || 'CL'}
              </div>
              <div className={styles.hoverCard}>
                {m.sender === 'HANDYMAN' ? `${HANDYMAN_NAME} · Handyman` : m.customerName ? `${m.customerName} · Customer` : 'Customer'}
              </div>
            </div>
            {m.type === 'TEXT' ? (
              m.sender === 'HANDYMAN' ? (
                <div className={styles.user}>{m.text}</div>
              ) : (
                <div className={styles.assistant}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
              )
            ) : (
              <div className={styles.typing}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.composer}>
        <input className={styles.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder='Reply as Handyman…' />
        <button className={styles.button} onClick={sendHandyman} disabled={busy}>
          Send
        </button>
      </div>
    </div>
  );
}
