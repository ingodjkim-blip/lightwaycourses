"use client";

import { signOut } from "firebase/auth";
import { GraduationCap } from "lucide-react";
import { AdminApp } from "@/components/admin/AdminApp";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { StudentApp } from "@/components/student/StudentApp";
import { TeacherApp } from "@/components/teacher/TeacherApp";
import { useAuthProfile } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-curriculum";
import { auth } from "@/lib/firebase";

export default function Home() {
  const { user, profile, loading, profileError } = useAuthProfile();
  const { curriculum, curriculumLoading } = useCurriculum(Boolean(profile));

  if (loading || (profile && curriculumLoading)) {
    return (
      <main className="center-screen app-loading">
        <div className="brand-mark"><GraduationCap size={28} /></div>
        <div className="spinner" />
        <p>Opening your Lightway workspace…</p>
      </main>
    );
  }

  if (!user) return <LoginScreen />;

  if (profileError || !profile) {
    return (
      <main className="center-screen">
        <section className="error-card">
          <span className="eyebrow">ACCOUNT SETUP NEEDED</span>
          <h1>Your login is valid, but no role profile was found.</h1>
          <p>{profileError}</p>
          <button className="button primary" onClick={() => void signOut(auth)}>Return to login</button>
        </section>
      </main>
    );
  }

  if (!curriculum) return null;
  if (profile.role === "admin") return <AdminApp profile={profile} curriculum={curriculum} />;
  if (profile.role === "teacher") return <TeacherApp profile={profile} curriculum={curriculum} />;
  return <StudentApp profile={profile} curriculum={curriculum} />;
}
