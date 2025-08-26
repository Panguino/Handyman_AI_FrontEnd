'use client';
import { useMemo, useState } from 'react';

export default function ContactCapture({ conversationId, onSaved }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = useMemo(() => {
    const hasName = name.trim().length >= 2;
    const hasContact = (email && /@/.test(email)) || (phone && phone.replace(/\D/g, '').length >= 7);
    const hasAddress = address.trim().length >= 5;
    return hasName && hasContact && hasAddress;
  }, [name, email, phone, address]);

  async function save() {
    if (!valid) {
      setError('Please provide your name, at least one contact method (email or phone), and your service address.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conversationId,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          stage: 'READY_FOR_QUOTING',
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved?.();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, margin: '8px 0', background: 'var(--surface)' }}>
      <strong>Contact information</strong>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <input placeholder='Full name' value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder='Phone' value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder='Address' value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save} disabled={busy || !valid}>
          Save
        </button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>We’ll only use this to contact you about your project.</span>
      </div>
      {error && <div style={{ color: '#b91c1c', marginTop: 6, fontSize: 12 }}>{error}</div>}
    </div>
  );
}
