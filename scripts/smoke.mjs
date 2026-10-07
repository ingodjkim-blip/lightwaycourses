import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: "AIzaSyA1221-NjogOmgPKENEL8KUwy6sZ4tfKCU",
  authDomain: "lightway-course.firebaseapp.com",
  projectId: "lightway-course",
  storageBucket: "lightway-course.firebasestorage.app",
  messagingSenderId: "48135183063",
  appId: "1:48135183063:web:2d5f2638413c877a15ee92",
};
const password = process.env.LIGHTWAY_DEMO_PASSWORD;
if (!password) throw new Error("Set LIGHTWAY_DEMO_PASSWORD before running the smoke test.");
const teacherApp = initializeApp(config, "smoke-teacher");
const studentApp = initializeApp(config, "smoke-student");
const adminApp = initializeApp(config, "smoke-admin");
const teacherAuth = getAuth(teacherApp);
const studentAuth = getAuth(studentApp);
const adminAuth = getAuth(adminApp);
const teacherDb = getFirestore(teacherApp);
const studentDb = getFirestore(studentApp);
const adminDb = getFirestore(adminApp);
let sessionId;
let classId;
let adminReady = false;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForActivity(sessionRef, activityId) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { stop(); reject(new Error(`Timed out waiting for ${activityId}`)); }, 10000);
    const stop = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.data()?.currentActivityId === activityId) {
        clearTimeout(timeout);
        stop();
        resolve();
      }
    }, reject);
  });
}

try {
  const hosting = await fetch("https://lightway-course.web.app");
  assert(hosting.ok && (await hosting.text()).includes("Lightway Learning"), "Hosting smoke check failed");
  console.log("✓ Hosting serves the production build");

  const teacherCredential = await signInWithEmailAndPassword(teacherAuth, "teacher@lightway.edu.vn", password);
  const studentCredential = await signInWithEmailAndPassword(studentAuth, "anna@student.lightway.edu.vn", password);
  await signInWithEmailAndPassword(adminAuth, "admin@lightway.edu.vn", password);
  adminReady = true;
  const [teacherProfile, studentProfile] = await Promise.all([
    getDoc(doc(teacherDb, "users", teacherCredential.user.uid)),
    getDoc(doc(studentDb, "users", studentCredential.user.uid)),
  ]);
  assert(teacherProfile.data()?.role === "teacher" && studentProfile.data()?.role === "student", "Role profiles are invalid");
  console.log("✓ Teacher and student authentication + roles work");

  const teacherClasses = await getDocs(query(collection(teacherDb, "classes"), where("teacherId", "==", teacherCredential.user.uid)));
  const studentClasses = await getDocs(query(collection(studentDb, "classes"), where("studentIds", "array-contains", studentCredential.user.uid)));
  assert(!teacherClasses.empty && !studentClasses.empty, "Seeded class is not queryable by both roles");
  classId = teacherClasses.docs[0].id;
  console.log("✓ Role-scoped class queries pass security rules");

  const smokeJoinCode = `TS${Date.now().toString().slice(-4)}`;
  const sessionRef = await addDoc(collection(teacherDb, "classSessions"), {
    classId,
    className: "TOEIC Demo Class",
    teacherId: teacherCredential.user.uid,
    teacherName: "Ms. Linh Nguyen",
    status: "active",
    mode: "follow",
    locked: false,
    currentCourseId: "toeic",
    currentSkillId: "toeic-reading",
    currentUnitId: "toeic-reading-parts-of-speech",
    currentActivityId: "pos-03",
    revealedActivityIds: [],
    coveredActivityIds: ["pos-03"],
    joinCode: smokeJoinCode,
    startedAt: serverTimestamp(),
    endedAt: null,
  });
  sessionId = sessionRef.id;
  await updateDoc(doc(teacherDb, "classes", classId), { activeSessionId: sessionId, updatedAt: serverTimestamp() });

  const joinLookup = await getDocs(query(collection(studentDb, "classSessions"), where("classId", "==", classId), where("joinCode", "==", smokeJoinCode), where("status", "==", "active")));
  assert(joinLookup.size === 1, "Join-code query failed");
  console.log("✓ Student join-code lookup works with the deployed index");

  const studentSessionRef = doc(studentDb, "classSessions", sessionId);
  assert((await getDoc(studentSessionRef)).data()?.currentActivityId === "pos-03", "Student cannot read the live session");
  await setDoc(doc(studentDb, "classSessions", sessionId, "participants", studentCredential.user.uid), {
    studentId: studentCredential.user.uid,
    fullName: "Anna Tran",
    status: "connected",
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });

  const realtimeUpdate = waitForActivity(studentSessionRef, "pos-04");
  await updateDoc(sessionRef, { currentActivityId: "pos-04", coveredActivityIds: arrayUnion("pos-04"), updatedAt: serverTimestamp() });
  await realtimeUpdate;
  console.log("✓ Student listener receives teacher activity changes in real time");

  await setDoc(doc(studentDb, "classSessions", sessionId, "responses", `${studentCredential.user.uid}_pos-03`), {
    studentId: studentCredential.user.uid,
    studentName: "Anna Tran",
    activityId: "pos-03",
    answer: "Adverb",
    correct: true,
    submittedAt: serverTimestamp(),
  });
  const responses = await getDocs(collection(teacherDb, "classSessions", sessionId, "responses"));
  assert(responses.size === 1, "Teacher did not receive the student response");
  console.log("✓ Student response write and teacher aggregate read work");

  let studentControlBlocked = false;
  try { await updateDoc(studentSessionRef, { mode: "free" }); }
  catch { studentControlBlocked = true; }
  assert(studentControlBlocked, "Security rules allowed a student to control the session");
  console.log("✓ Security rules block student session control");

  await updateDoc(sessionRef, { mode: "guided", updatedAt: serverTimestamp() });
  await updateDoc(sessionRef, { mode: "follow", updatedAt: serverTimestamp() });
  console.log("✓ Teacher can switch Guided and Follow modes");
} finally {
  if (sessionId && classId) {
    const batch = writeBatch(teacherDb);
    batch.update(doc(teacherDb, "classSessions", sessionId), { status: "ended", endedAt: serverTimestamp(), locked: false });
    batch.update(doc(teacherDb, "classes", classId), { activeSessionId: null, updatedAt: serverTimestamp() });
    await batch.commit().catch(() => undefined);
  }
  if (adminReady) {
    if (sessionId) {
      const session = doc(adminDb, "classSessions", sessionId);
      const cleanup = writeBatch(adminDb);
      const [participants, responses] = await Promise.all([
        getDocs(collection(adminDb, "classSessions", sessionId, "participants")),
        getDocs(collection(adminDb, "classSessions", sessionId, "responses")),
      ]);
      participants.docs.forEach((item) => cleanup.delete(item.ref));
      responses.docs.forEach((item) => cleanup.delete(item.ref));
      cleanup.delete(session);
      await cleanup.commit();
    }
  }
  await Promise.all([deleteApp(teacherApp), deleteApp(studentApp), deleteApp(adminApp)]);
}

console.log("Smoke test complete. Test session and artifacts cleaned up.");
