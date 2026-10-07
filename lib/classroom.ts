import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity, ClassRecord, Unit, UserProfile } from "@/types";

function makeJoinCode() {
  return `LW${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function startClassSession(classRecord: ClassRecord, teacher: UserProfile, unit: Unit, firstActivity: Activity) {
  const classRef = doc(db, "classes", classRecord.id);
  const sessionRef = doc(collection(db, "classSessions"));
  // A retried/double-clicked start reopens the active session, without orphaning one.
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(classRef);
    if (!snapshot.exists()) throw new Error("This class no longer exists.");
    if (snapshot.data().activeSessionId) return snapshot.data().activeSessionId as string;
    transaction.set(sessionRef, {
      classId: classRecord.id, className: classRecord.name,
      teacherId: teacher.id, teacherName: teacher.fullName,
      status: "active", mode: "follow", locked: false,
      currentCourseId: unit.courseId, currentSkillId: unit.skillId,
      currentUnitId: unit.id, currentActivityId: firstActivity.id,
      revealedActivityIds: [], coveredActivityIds: [firstActivity.id],
      joinCode: makeJoinCode(), startedAt: serverTimestamp(), endedAt: null,
    });
    transaction.update(classRef, { activeSessionId: sessionRef.id, updatedAt: serverTimestamp() });
    return sessionRef.id;
  });
}

export async function endClassSession(sessionId: string, classId: string) {
  const classRef = doc(db, "classes", classId);
  const sessionRef = doc(db, "classSessions", sessionId);
  await runTransaction(db, async (transaction) => {
    const classSnapshot = await transaction.get(classRef);
    const sessionSnapshot = await transaction.get(sessionRef);
    if (sessionSnapshot.exists() && sessionSnapshot.data().status !== "ended") {
      transaction.update(sessionRef, { status: "ended", endedAt: serverTimestamp(), locked: false });
    }
    // A stale teacher tab must not clear a newer session's pointer.
    if (classSnapshot.data()?.activeSessionId === sessionId) {
      transaction.update(classRef, { activeSessionId: null, updatedAt: serverTimestamp() });
    }
  });
}
