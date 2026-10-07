import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity, ClassRecord, SessionMode, Unit, UserProfile } from "@/types";

function makeJoinCode() {
  return `LW${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function startClassSession(classRecord: ClassRecord, teacher: UserProfile, unit: Unit, firstActivity: Activity) {
  const sessionRef = await addDoc(collection(db, "classSessions"), {
    classId: classRecord.id,
    className: classRecord.name,
    teacherId: teacher.id,
    teacherName: teacher.fullName,
    status: "active",
    mode: "follow" satisfies SessionMode,
    locked: false,
    currentCourseId: unit.courseId,
    currentSkillId: unit.skillId,
    currentUnitId: unit.id,
    currentActivityId: firstActivity.id,
    revealedActivityIds: [],
    coveredActivityIds: [firstActivity.id],
    joinCode: makeJoinCode(),
    startedAt: serverTimestamp(),
    endedAt: null,
  });
  await updateDoc(doc(db, "classes", classRecord.id), { activeSessionId: sessionRef.id, updatedAt: serverTimestamp() });
  return sessionRef.id;
}

export async function endClassSession(sessionId: string, classId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "classSessions", sessionId), { status: "ended", endedAt: serverTimestamp(), locked: false });
  batch.update(doc(db, "classes", classId), { activeSessionId: null, updatedAt: serverTimestamp() });
  await batch.commit();
}
