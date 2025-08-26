'use client';

export default function StageBadge({ stage }) {
  if (!stage) return null;
  const label = stage.replaceAll('_', ' ');
  return (
    <span
      style={{
        padding: '2px 6px',
        borderRadius: 6,
        fontSize: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {label}
    </span>
  );
}

