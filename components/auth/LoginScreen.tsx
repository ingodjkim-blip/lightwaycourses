"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ArrowRight, BookOpenCheck, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { auth, friendlyFirebaseError } from "@/lib/firebase";

const quickAccounts = [
  { label: "Teacher", email: "teacher@lightway.edu.vn" },
  { label: "Student", email: "anna@student.lightway.edu.vn" },
  { label: "Admin", email: "admin@lightway.edu.vn" },
];

export function LoginScreen() {
  const [email, setEmail] = useState("teacher@lightway.edu.vn");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (nextError) {
      setError(friendlyFirebaseError(nextError));
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand-mark"><Sparkles size={22} /></span><strong>LIGHTWAY</strong><span>LEARNING</span></div>
        <div className="story-copy">
          <span className="eyebrow light">A SMARTER CLASSROOM RHYTHM</span>
          <h1>One lesson.<br />Every learner<br /><em>in sync.</em></h1>
          <p>Focused exam preparation for TOEIC, IELTS, VSTEP and a strong English foundation.</p>
        </div>
        <div className="feature-row">
          <div><Radio size={20} /><span><strong>Live Class Mode</strong>Real-time lesson flow</span></div>
          <div><BookOpenCheck size={20} /><span><strong>Structured learning</strong>Progress that makes sense</span></div>
          <div><ShieldCheck size={20} /><span><strong>Role-aware</strong>Built for every classroom</span></div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Continue learning</h2>
          <p className="muted">Sign in to your Lightway workspace.</p>
          <div className="quick-accounts" aria-label="Demo account shortcuts">
            {quickAccounts.map((account) => (
              <button key={account.email} type="button" className={email === account.email ? "active" : ""} onClick={() => { setEmail(account.email); setPassword(""); }}>
                {account.label}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="button primary wide" type="submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}</button>
          </form>
          <p className="demo-note">Use the demo password supplied by the project administrator.</p>
        </div>
      </section>
    </main>
  );
}
