import rawData from "./demo-curriculum.json";
import type { Activity, Course, Skill, Unit } from "@/types";

export const demoCurriculum = {
  courses: rawData.courses as Course[],
  skills: rawData.skills as Skill[],
  units: rawData.units as Unit[],
  activities: rawData.activities as Activity[],
};

export const demoAccounts = [
  { fullName: "Lightway Admin", email: "admin@lightway.edu.vn", role: "admin" },
  { fullName: "Ms. Linh Nguyen", email: "teacher@lightway.edu.vn", role: "teacher" },
  { fullName: "Anna Tran", email: "anna@student.lightway.edu.vn", role: "student" },
  { fullName: "Ben Pham", email: "ben@student.lightway.edu.vn", role: "student" },
  { fullName: "Chris Le", email: "chris@student.lightway.edu.vn", role: "student" }
] as const;
