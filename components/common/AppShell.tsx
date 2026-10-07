"use client";

import type { ReactNode } from "react";
import { signOut } from "firebase/auth";
import { LogOut, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import type { UserProfile } from "@/types";

export interface NavItem { id: string; label: string; icon: ReactNode; }

export function AppShell({ profile, navItems, active, onNavigate, children, badge }: { profile: UserProfile; navItems: NavItem[]; active: string; onNavigate: (id: string) => void; children: ReactNode; badge?: ReactNode; }) {
  const [open, setOpen] = useState(false);
  const initials = profile.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>LIGHTWAY</strong><span>LEARNING</span></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={20} /></button></div>
        <div className="role-pill">{profile.role} workspace</div>
        <nav>
          {navItems.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => { onNavigate(item.id); setOpen(false); }}>{item.icon}<span>{item.label}</span></button>)}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="user-copy"><strong>{profile.fullName}</strong><span>{profile.email}</span></div>
          <button className="icon-button" title="Log out" onClick={() => void signOut(auth)}><LogOut size={18} /></button>
        </div>
      </aside>
      {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <div className="workspace">
        <header className="mobile-header"><button className="icon-button" onClick={() => setOpen(true)}><Menu size={22} /></button><strong>LIGHTWAY</strong>{badge || <span />}</header>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</header>;
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return <div className="empty-state">{icon}<h3>{title}</h3><p>{description}</p></div>;
}
