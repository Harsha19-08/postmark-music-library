'use client';
import { useState } from 'react';
import { coverUri } from '@/lib/art';

export default function Login() {
  const [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.href = '/'; else { setErr(((await r.json().catch(() => ({}))) as { error?: string }).error || 'Could not sign in'); setBusy(false); }
  };
  return (
    <main className="login">
      <div className="login-stamp"><div className="stamp is-static"><span className="stamp-art"><img src={coverUri('Postmark|login')} alt="" /></span><span className="stamp-title">Postmark</span><span className="stamp-sub">Your music, kept</span></div></div>
      <form onSubmit={submit} className="login-form">
        <label className="field"><span>Password</span><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus autoComplete="current-password" required /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn solid" disabled={busy || !pw}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
