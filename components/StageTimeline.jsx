'use client';
import styles from './StageTimeline.module.scss';

const STAGES = ['DEFINITION', 'RECAP_PENDING', 'RECAP_CONFIRMED', 'READY_FOR_QUOTING', 'QUOTING', 'APPROVED', 'BOOKING', 'SCHEDULED', 'COMPLETED'];

export default function StageTimeline({ stage }) {
  const idx = Math.max(0, STAGES.indexOf(stage || 'DEFINITION'));
  return (
    <div className={styles.container}>
      {STAGES.map((s, i) => (
        <span key={s} className={styles.item}>
          <span
            title={s.replaceAll('_', ' ')}
            className={styles.dot}
            style={{
              background: i <= idx ? 'var(--primary)' : 'var(--border)',
              boxShadow: i === idx ? '0 0 0 3px rgba(59,130,246,0.25)' : 'none',
            }}
          />
          <span className={styles.label} style={{ color: i === idx ? 'var(--fg)' : 'var(--muted)' }}>
            {s.replaceAll('_', ' ')}
          </span>
          {i < STAGES.length - 1 && <span className={styles.connector} />}
        </span>
      ))}
    </div>
  );
}
