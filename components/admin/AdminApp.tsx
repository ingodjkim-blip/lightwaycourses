"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { BookOpen, CalendarDays, LayoutDashboard, School, Users } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/common/AppShell";
import { CurriculumExplorer } from "@/components/common/CurriculumExplorer";
import { db } from "@/lib/firebase";
import type { ClassRecord, CurriculumData, UserProfile } from "@/types";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={19} /> },
  { id: "users", label: "Users", icon: <Users size={19} /> },
  { id: "classes", label: "Classes", icon: <School size={19} /> },
  { id: "curriculum", label: "Curriculum", icon: <BookOpen size={19} /> },
];

export function AdminApp({ profile, curriculum }: { profile: UserProfile; curriculum: CurriculumData }) {
  const [active, setActive] = useState("dashboard");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);

  useEffect(() => {
    const stopUsers = onSnapshot(collection(db, "users"), (snapshot) => setUsers(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<UserProfile, "id">) }))));
    const stopClasses = onSnapshot(collection(db, "classes"), (snapshot) => setClasses(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ClassRecord, "id">) }))));
    return () => { stopUsers(); stopClasses(); };
  }, []);

  const counts = useMemo(() => ({ teachers: users.filter((user) => user.role === "teacher").length, students: users.filter((user) => user.role === "student").length }), [users]);

  return (
    <AppShell profile={profile} navItems={navItems} active={active} onNavigate={setActive}>
      <main className="page-content">
        {active === "dashboard" && <><PageHeader eyebrow="ADMIN OVERVIEW" title={`Good ${greeting()}, ${firstName(profile.fullName)}.`} description="Your learning operation at a glance." /><div className="metrics-grid"><Metric label="Total users" value={users.length} icon={<Users />} tone="purple" /><Metric label="Teachers" value={counts.teachers} icon={<School />} tone="cyan" /><Metric label="Students" value={counts.students} icon={<Users />} tone="amber" /><Metric label="Active classes" value={classes.filter((item) => item.active).length} icon={<CalendarDays />} tone="green" /><Metric label="Courses" value={curriculum.courses.length} icon={<BookOpen />} tone="navy" /></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">SYSTEM SNAPSHOT</span><h2>What is ready</h2></div></div><div className="readiness-list"><div><span className="status-dot live" /><strong>Firebase Authentication</strong><small>Email/password and persistent sessions</small></div><div><span className="status-dot live" /><strong>Realtime Class Mode</strong><small>Firestore-backed teacher control</small></div><div><span className="status-dot live" /><strong>Curriculum engine</strong><small>{curriculum.activities.length} structured activities loaded</small></div></div>{curriculum.source === "bundled" && <div className="inline-notice">The app is showing bundled curriculum because Firestore curriculum data is not seeded yet.</div>}</section></>}
        {active === "users" && <><PageHeader eyebrow="PEOPLE" title="Users" description="Role assignments and account status." /><section className="panel table-panel"><div className="data-table"><div className="data-row data-head"><span>Name</span><span>Role</span><span>Status</span><span>Email</span></div>{users.map((user) => <div className="data-row" key={user.id}><span><strong>{user.fullName}</strong></span><span><b className={`role-tag ${user.role}`}>{user.role}</b></span><span><b className="status-tag"><i />{user.active ? "Active" : "Disabled"}</b></span><span className="muted">{user.email}</span></div>)}</div>{!users.length && <EmptyState title="No user profiles yet" description="Run the seed script after enabling Email/Password Authentication." icon={<Users />} />}</section></>}
        {active === "classes" && <><PageHeader eyebrow="CLASS MANAGEMENT" title="Classes" description="Persistent teaching groups and live status." /><div className="card-grid">{classes.map((item) => <article className="class-card" key={item.id}><div className="class-card-top"><span className={item.activeSessionId ? "live-chip" : "quiet-chip"}>{item.activeSessionId ? "LIVE NOW" : "READY"}</span><School size={22} /></div><h3>{item.name}</h3><p>{item.studentIds.length} enrolled students</p><div className="class-meta"><span>Courses</span><strong>{item.courseIds.map((id) => id.toUpperCase()).join(", ")}</strong></div></article>)}</div>{!classes.length && <EmptyState title="No classes yet" description="Seed the demo to create TOEIC Demo Class." icon={<School />} />}</>}
        {active === "curriculum" && <><PageHeader eyebrow="LEARNING ARCHITECTURE" title="Curriculum" description="Courses, skills and structured units." /><CurriculumExplorer curriculum={curriculum} /></>}
      </main>
    </AppShell>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div><strong>{value}</strong><span>{label}</span></div></article>;
}

function firstName(name: string) { return name.split(" ")[0]; }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"; }
