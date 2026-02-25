import { useState, useEffect, useCallback } from 'react';

// ─── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast ${type}`}>
      <i className={`bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}
        style={{ color: type === 'success' ? 'var(--kl-green)' : 'var(--kl-red)' }}></i>
      {message}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);
  return { toast, showToast, hideToast };
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 36 }) {
  return (
    <div className="page-loading">
      <div className="spinner" style={{ width: size, height: size }}></div>
    </div>
  );
}

// ─── Breadcrumb ─────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
export function Breadcrumb({ items }) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <i className="bi bi-chevron-right breadcrumb-sep"></i>}
          {item.path ? (
            <Link to={item.path}>{item.label}</Link>
          ) : (
            <span style={{ color: '#333' }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'bi-inbox', title, description, action }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`}></i>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// ─── Stars ─────────────────────────────────────────────────────────────────────
export function Stars({ rating, size = 14 }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`bi bi-star${i <= Math.round(rating) ? '-fill' : ''}`}
          style={{ fontSize: size, color: '#ffc107' }}></i>
      ))}
    </span>
  );
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────────
export function Countdown({ endTime }) {
  const [time, setTime] = useState({ h: '00', m: '00', s: '00' });

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setTime({ h: '00', m: '00', s: '00' }); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  return (
    <div className="countdown">
      <span className="countdown-block">{time.h}</span>
      <span className="countdown-sep">:</span>
      <span className="countdown-block">{time.m}</span>
      <span className="countdown-sep">:</span>
      <span className="countdown-block">{time.s}</span>
    </div>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────────────────
export function Pagination({ current, total, pageSize, onChange }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const range = [];
  for (let i = Math.max(1, current - 2); i <= Math.min(pages, current + 2); i++) range.push(i);
  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onChange(current - 1)} disabled={current === 1}>
        <i className="bi bi-chevron-left"></i>
      </button>
      {range[0] > 1 && <><button className="page-btn" onClick={() => onChange(1)}>1</button>{range[0] > 2 && <span style={{ padding: '0 4px' }}>...</span>}</>}
      {range.map(p => (
        <button key={p} className={`page-btn ${p === current ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      {range[range.length - 1] < pages && <><span style={{ padding: '0 4px' }}>...</span><button className="page-btn" onClick={() => onChange(pages)}>{pages}</button></>}
      <button className="page-btn" onClick={() => onChange(current + 1)} disabled={current === pages}>
        <i className="bi bi-chevron-right"></i>
      </button>
    </div>
  );
}