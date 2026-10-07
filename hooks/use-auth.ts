"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { browserLocalPersistence, onAuthStateChanged, setPersistence } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, initializeAnalytics } from "@/lib/firebase";
import type { UserProfile } from "@/types";

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    void setPersistence(auth, browserLocalPersistence);
    void initializeAnalytics();
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setProfile(null);
      setProfileError("");
      if (!nextUser) {
        setLoading(false);
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "users", nextUser.uid));
        if (!snapshot.exists()) {
          setProfileError("This Firebase account does not have a Lightway role profile.");
        } else {
          setProfile({ id: snapshot.id, ...(snapshot.data() as Omit<UserProfile, "id">) });
        }
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return { user, profile, loading, profileError };
}
