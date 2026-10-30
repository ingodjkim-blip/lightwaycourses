"use client";

import { ArrowRight, BookOpen, ChevronRight, Layers3, ListTree } from "lucide-react";
import { useMemo, useState } from "react";
import type { Activity, CurriculumData, Unit } from "@/types";

export function CurriculumExplorer({ curriculum, onOpenUnit, compact = false }: { curriculum: CurriculumData; onOpenUnit?: (unit: Unit, firstActivity?: Activity) => void; compact?: boolean; }) {
  const [courseId, setCourseId] = useState(curriculum.courses[0]?.id || "");
  const [ieltsBranch, setIeltsBranch] = useState<"overall" | "skills">("overall");
  const course = curriculum.courses.find((item) => item.id === courseId);
  const skills = useMemo(() => curriculum.skills.filter((item) => item.courseId === courseId), [curriculum.skills, courseId]);
  const units = useMemo(() => curriculum.units.filter((item) => item.courseId === courseId), [curriculum.units, courseId]);
  const requestedIeltsSkillIds = ["ielts-listening", "ielts-writing", "ielts-reading", "ielts-speaking"];

  function unitRow(unit: Unit) {
    const first = curriculum.activities.filter((activity) => activity.unitId === unit.id).sort((a, b) => a.order - b.order)[0];
    return <button className="unit-row" key={unit.id} onClick={() => onOpenUnit?.(unit, first)}><span><strong>{unit.title}</strong><small>{unit.activityCount} {unit.activityCount === 1 ? "activity" : "activities"}</small></span>{onOpenUnit && <ArrowRight size={17} />}</button>;
  }

  function standardSkillGrid() {
    return <div className="skill-grid">{skills.map((skill) => {
      const skillUnits = units.filter((unit) => unit.skillId === skill.id);
      return <section className="skill-card" key={skill.id}><div className="skill-card-title"><div><span>{String(skill.order).padStart(2, "0")}</span><h3>{skill.name}</h3></div><ChevronRight size={18} /></div>{skillUnits.length ? skillUnits.map(unitRow) : <p className="coming-soon">Curriculum coming next</p>}</section>;
    })}</div>;
  }

  return (
    <div className={compact ? "curriculum-explorer compact" : "curriculum-explorer"}>
      <div className="course-tabs">
        {curriculum.courses.map((item) => <button key={item.id} className={item.id === courseId ? "active" : ""} onClick={() => setCourseId(item.id)}><span style={{ background: item.color }} />{item.name}</button>)}
      </div>
      {course && <div className="course-overview"><div className="course-icon" style={{ background: course.color }}><BookOpen size={26} /></div><div><span className="eyebrow">{course.code} PROGRAM</span><h2>{course.name}</h2><p>{course.description}</p></div></div>}
      {courseId === "ielts" && <div className="curriculum-branch-switch" role="tablist" aria-label="IELTS curriculum view">
        <button role="tab" aria-selected={ieltsBranch === "overall"} className={ieltsBranch === "overall" ? "active" : ""} onClick={() => setIeltsBranch("overall")}><Layers3 size={18} /><span><strong>Unit overall</strong><small>Learn through the existing mixed-skill units</small></span></button>
        <button role="tab" aria-selected={ieltsBranch === "skills"} className={ieltsBranch === "skills" ? "active" : ""} onClick={() => setIeltsBranch("skills")}><ListTree size={18} /><span><strong>Skills</strong><small>Choose Listening, Writing, Reading or Speaking</small></span></button>
      </div>}
      {courseId !== "ielts" && standardSkillGrid()}
      {courseId === "ielts" && ieltsBranch === "overall" && <div className="skill-grid overall-unit-grid"><section className="skill-card"><div className="skill-card-title"><div><span>01</span><h3>IELTS overall units</h3></div><ChevronRight size={18} /></div>{units.filter((unit) => unit.track !== "skills").length ? units.filter((unit) => unit.track !== "skills").map(unitRow) : <p className="coming-soon">Curriculum coming next</p>}</section></div>}
      {courseId === "ielts" && ieltsBranch === "skills" && <div className="skill-grid ielts-skill-grid">{requestedIeltsSkillIds.map((skillId, index) => {
        const skill = skills.find((item) => item.id === skillId);
        if (!skill) return null;
        const skillUnits = units.filter((unit) => unit.skillId === skill.id && unit.track === "skills");
        return <section className="skill-card" key={skill.id}><div className="skill-card-title"><div><span>{String(index + 1).padStart(2, "0")}</span><h3>{skill.name}</h3></div><ChevronRight size={18} /></div>{skillUnits.length ? skillUnits.map(unitRow) : <p className="coming-soon">Lessons coming soon</p>}</section>;
      })}</div>}
    </div>
  );
}
