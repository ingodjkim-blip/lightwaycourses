export type Role = "admin" | "teacher" | "student";
export type SessionMode = "follow" | "guided" | "free";
export type SessionStatus = "waiting" | "active" | "ended";
export type ActivityType =
  | "teaching_slide"
  | "multiple_choice"
  | "fill_blank"
  | "short_answer"
  | "reading"
  | "speaking_prompt"
  | "writing_prompt";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: unknown;
}

export interface Course { id: string; name: string; code: string; description: string; color: string; order: number; }
export interface Skill { id: string; courseId: string; name: string; order: number; }
export interface Unit { id: string; courseId: string; skillId: string; title: string; description: string; order: number; activityCount: number; aiPracticeConfig: { enabled: boolean; level: string; targets: string[]; allowedActivityTypes: ActivityType[]; difficultyRange: string; }; }
export interface Activity {
  id: string;
  courseId: string;
  skillId: string;
  unitId: string;
  type: ActivityType;
  title: string;
  instructions: string;
  content: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  order: number;
}

export interface ClassRecord {
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  courseIds: string[];
  active: boolean;
  activeSessionId?: string | null;
}

export interface ClassSession {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  status: SessionStatus;
  mode: SessionMode;
  locked: boolean;
  currentCourseId: string;
  currentSkillId: string;
  currentUnitId: string;
  currentActivityId: string;
  revealedActivityIds: string[];
  coveredActivityIds: string[];
  joinCode: string;
  startedAt?: unknown;
  endedAt?: unknown;
}

export interface Participant {
  id: string;
  studentId: string;
  fullName: string;
  status: "connected" | "disconnected";
  joinedAt?: unknown;
  lastSeen?: unknown;
}

export interface SessionResponse {
  id: string;
  studentId: string;
  studentName: string;
  activityId: string;
  answer: string;
  correct: boolean;
  submittedAt?: unknown;
}

export interface UnitProgress {
  completedActivityIds: string[];
  lastActivityId: string;
  score: number;
  updatedAt?: unknown;
}

export interface CurriculumData {
  courses: Course[];
  skills: Skill[];
  units: Unit[];
  activities: Activity[];
  source: "firestore" | "bundled";
}
