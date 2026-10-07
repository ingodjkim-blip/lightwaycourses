import { collection, getDocs } from "firebase/firestore";
import { demoCurriculum } from "@/data/demo";
import { db } from "@/lib/firebase";
import type { Activity, Course, CurriculumData, Skill, Unit } from "@/types";

function withId<T>(snapshot: { docs: { id: string; data: () => unknown }[] }): T[] {
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as object) })) as T[];
}

export async function loadCurriculum(): Promise<CurriculumData> {
  try {
    const [courseSnapshot, skillSnapshot, unitSnapshot, activitySnapshot] = await Promise.all([
      getDocs(collection(db, "courses")),
      getDocs(collection(db, "skills")),
      getDocs(collection(db, "units")),
      getDocs(collection(db, "activities")),
    ]);
    if (!courseSnapshot.empty && !activitySnapshot.empty) {
      return {
        courses: withId<Course>(courseSnapshot).sort((a, b) => a.order - b.order),
        skills: withId<Skill>(skillSnapshot).sort((a, b) => a.order - b.order),
        units: withId<Unit>(unitSnapshot).sort((a, b) => a.order - b.order),
        activities: withId<Activity>(activitySnapshot).sort((a, b) => a.order - b.order),
        source: "firestore",
      };
    }
  } catch {
    // Bundled seed content keeps the interface useful before the first seed run.
  }
  return { ...demoCurriculum, source: "bundled" };
}
