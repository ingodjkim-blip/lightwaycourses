"use client";

import { ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { Activity, CurriculumData, Unit } from "@/types";

export function CurriculumExplorer({ curriculum, onOpenUnit, compact = false }: { curriculum: CurriculumData; onOpenUnit?: (unit: Unit, firstActivity?: Activity) => void; compact?: boolean; }) {
  const [courseId, setCourseId] = useState(curriculum.courses[0]?.id || "");
  const course = curriculum.courses.find((item) => item.id === courseId);
  const skills = useMemo(() => curriculum.skills.filter((item) => item.courseId === courseId), [curriculum.skills, courseId]);
  const units = useMemo(() => curriculum.units.filter((item) => item.courseId === courseId), [curriculum.units, courseId]);

  return (
    <div className={compact ? "curriculum-explorer compact" : "curriculum-explorer"}>
      <div className="course-tabs">
        {curriculum.courses.map((item) => <button key={item.id} className={item.id === courseId ? "active" : ""} onClick={() => setCourseId(item.id)}><span style={{ background: item.color }} />{item.name}</button>)}
      </div>
      {course && <div className="course-overview"><div className="course-icon" style={{ background: course.color }}><BookOpen size={26} /></div><div><span className="eyebrow">{course.code} PROGRAM</span><h2>{course.name}</h2><p>{course.description}</p></div></div>}
      <div className="skill-grid">
        {skills.map((skill) => {
          const skillUnits = units.filter((unit) => unit.skillId === skill.id);
          return <section className="skill-card" key={skill.id}><div className="skill-card-title"><div><span>{String(skill.order).padStart(2, "0")}</span><h3>{skill.name}</h3></div><ChevronRight size={18} /></div>{skillUnits.length ? skillUnits.map((unit) => {
            const first = curriculum.activities.filter((activity) => activity.unitId === unit.id).sort((a, b) => a.order - b.order)[0];
            return <button className="unit-row" key={unit.id} onClick={() => onOpenUnit?.(unit, first)}><span><strong>{unit.title}</strong><small>{unit.activityCount} {unit.activityCount === 1 ? "activity" : "activities"}</small></span>{onOpenUnit && <ArrowRight size={17} />}</button>;
          }) : <p className="coming-soon">Curriculum coming next</p>}</section>;
        })}
      </div>
    </div>
  );
}
