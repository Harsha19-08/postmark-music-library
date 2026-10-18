'use client';
import { useEffect, useRef } from 'react';
import { useUI } from '@/lib/ui';

export function Toast() {
  const msg = useUI(s => s.toast), key = useUI(s => s.toastKey), ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || !key) return;
    el.classList.add('on'); const t = setTimeout(() => el.classList.remove('on'), 2800); return () => clearTimeout(t);
  }, [key]);
  return <div className="toast" ref={ref} role="status" aria-live="polite">{msg}</div>;
}

export function MenuLayer() {
  const menu = useUI(s => s.menu), close = useUI(s => s.closeMenu), ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k);
    ref.current?.querySelector('button')?.focus(); return () => removeEventListener('keydown', k);
  }, [menu, close]);
  if (!menu) return null;
  const mw = 232, left = Math.max(8, Math.min(menu.x - mw, innerWidth - mw - 8)), est = menu.items.length * 42, top = Math.max(8, Math.min(menu.y + 6, innerHeight - est - 16));
  return (
    <>
      <div className="scrim" onClick={close} onContextMenu={e => { e.preventDefault(); close(); }} />
      <div className="menu" ref={ref} role="menu" style={{ left, top }}>
        {menu.items.map((it, i) => it === 'sep' ? <hr key={i} /> : (
          <button key={i} role="menuitem" className={it.danger ? 'danger' : ''} onClick={() => { close(); it.onSelect(); }}>{it.label}</button>
        ))}
      </div>
    </>
  );
}

export function ModalLayer() {
  const m = useUI(s => s.modal), close = useUI(s => s.closeModal);
  useEffect(() => {
    if (!m) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);
  if (!m) return null;
  function cancel() { if (!m) return; if (m.kind === 'form') m.resolve(null); else if (m.kind === 'list') m.resolve(null); else m.resolve(false); close(); }
  return (
    <div className="modal-wrap" onClick={e => { if (e.target === e.currentTarget) cancel(); }}>
      {m.kind === 'form' && (
        <form className="modal" role="dialog" aria-label={m.title} onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; m.resolve(f); close(); }}>
          <h2>{m.title}</h2>
          {m.fields.map((f, i) => <label key={f.name} className="field"><span>{f.label}</span><input name={f.name} defaultValue={f.value} placeholder={f.placeholder} required={f.required} autoFocus={i === 0} autoComplete="off" /></label>)}
          <div className="modal-acts"><button type="button" className="btn" onClick={cancel}>Cancel</button><button type="submit" className="btn solid">{m.ok}</button></div>
        </form>
      )}
      {m.kind === 'list' && (
        <div className="modal" role="dialog" aria-label={m.title}>
          <h2>{m.title}</h2>
          <div className="modal-list">{m.options.map(o => <button key={o.id} className="btn list" onClick={() => { m.resolve(o.id); close(); }}><b>{o.label}</b>{o.sub && <span>{o.sub}</span>}</button>)}</div>
          <div className="modal-acts"><button className="btn" onClick={cancel}>Cancel</button></div>
        </div>
      )}
      {m.kind === 'confirm' && (
        <div className="modal" role="alertdialog" aria-label={m.title}>
          <h2>{m.title}</h2><p>{m.body}</p>
          <div className="modal-acts"><button className="btn" onClick={cancel}>Cancel</button><button className={`btn solid${m.danger ? ' danger' : ''}`} autoFocus onClick={() => { m.resolve(true); close(); }}>{m.ok}</button></div>
        </div>
      )}
    </div>
  );
}
