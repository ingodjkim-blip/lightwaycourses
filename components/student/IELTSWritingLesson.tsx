"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useId, useMemo, useState } from "react";
import { arrayUnion, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowLeft, BarChart3, BookOpenCheck, Check, ChevronRight, Info, PenLine, Save, Sparkles, X } from "lucide-react";
import {
  task1Models,
  task1Practices,
  task1Vocabulary,
  task2IndependentPrompt,
  task2Models,
  task2Prompt,
  task2Vocabulary,
  type ChartData,
  type VocabularyItem,
  type WritingModel,
} from "@/data/ielts-writing-lesson-1";
import { db, friendlyFirebaseError } from "@/lib/firebase";
import type { Unit, UnitProgress, UserProfile } from "@/types";

type TaskId = "task-1" | "task-2";
type Drafts = Record<string, string>;
type DraftStorageStatus = "loading" | "saved" | "unsaved";

const taskActivityIds: Record<TaskId, string> = {
  "task-1": "ielts-writing-skills-lesson-1-task-1",
  "task-2": "ielts-writing-skills-lesson-1-task-2",
};

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function BarChart({ data }: { data: ChartData }) {
  const width = 760;
  const height = 420;
  const margin = { top: 70, right: 24, bottom: 105, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const max = Math.max(80, Math.ceil(Math.max(...data.values.flat()) / 20) * 20);
  const ticks = Array.from({ length: max / 20 + 1 }, (_, index) => index * 20);
  const categoryWidth = plotWidth / data.categories.length;
  const groupWidth = Math.min(36, categoryWidth / (data.groups.length + 1));
  const colors = ["#4f46c7", "#19a6b8"];

  return (
    <figure className="writing-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`chart-${data.title.replaceAll(" ", "-")}`}>
        <title id={`chart-${data.title.replaceAll(" ", "-")}`}>{data.title}</title>
        <desc>A grouped bar chart. Exact percentage values are printed above every bar.</desc>
        <text x={width / 2} y={29} textAnchor="middle" className="chart-title">{data.title}</text>
        <text x={15} y={margin.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 15 ${margin.top + plotHeight / 2})`} className="axis-title">Percentage (%)</text>
        {ticks.map((tick) => {
          const y = margin.top + plotHeight - (tick / max) * plotHeight;
          return <g key={tick}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} className="chart-gridline" /><text x={margin.left - 10} y={y + 4} textAnchor="end" className="chart-tick">{tick}</text></g>;
        })}
        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} className="chart-axis" />
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight} y2={margin.top + plotHeight} className="chart-axis" />
        {data.categories.map((category, categoryIndex) => {
          const center = margin.left + categoryWidth * categoryIndex + categoryWidth / 2;
          const lines = category.split("\n");
          return <g key={category}>{data.groups.map((group, groupIndex) => {
            const value = data.values[groupIndex][categoryIndex];
            const barHeight = (value / max) * plotHeight;
            const x = center - (data.groups.length * groupWidth + (data.groups.length - 1) * 5) / 2 + groupIndex * (groupWidth + 5);
            const y = margin.top + plotHeight - barHeight;
            return <g key={group}><rect x={x} y={y} width={groupWidth} height={barHeight} rx="3" fill={colors[groupIndex]} /><text x={x + groupWidth / 2} y={y - 7} textAnchor="middle" className="chart-value">{value}%</text></g>;
          })}<text x={center} y={margin.top + plotHeight + 24} textAnchor="middle" className="chart-category">{lines.map((line, lineIndex) => <tspan key={line} x={center} dy={lineIndex ? 15 : 0}>{line}</tspan>)}</text></g>;
        })}
        {data.groups.map((group, index) => {
          const legendX = width / 2 - 145 + index * 190;
          return <g key={group}><rect x={legendX} y={height - 28} width="13" height="13" rx="2" fill={colors[index]} /><text x={legendX + 20} y={height - 17} className="chart-legend">{group}</text></g>;
        })}
      </svg>
    </figure>
  );
}

function VocabularyTerm({ item, children }: { item: VocabularyItem; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <span className="vocab-term-wrap" onKeyDown={onKeyDown}>
      <button type="button" className="vocab-highlight" aria-expanded={open} aria-controls={popoverId} onClick={() => setOpen((value) => !value)}>{children}</button>
      {open && <span className="vocab-popover" id={popoverId} role="dialog" aria-label={`Vocabulary: ${item.term}`}>
        <button type="button" className="vocab-popover-close" aria-label="Close vocabulary explanation" onClick={() => setOpen(false)}><X size={14} /></button>
        <strong>{item.term}</strong><b>{item.meaning}</b><span>{item.usage}</span><em>Example: {item.example}</em>
      </span>}
    </span>
  );
}

function HighlightedParagraph({ text, vocabulary }: { text: string; vocabulary: VocabularyItem[] }) {
  const pattern = useMemo(() => vocabulary.map((item) => item.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|"), [vocabulary]);
  const parts = pattern ? text.split(new RegExp(`(${pattern})`, "gi")) : [text];
  return <p>{parts.map((part, index) => {
    const item = vocabulary.find((entry) => entry.term.toLocaleLowerCase() === part.toLocaleLowerCase());
    return item ? <VocabularyTerm key={`${part}-${index}`} item={item}>{part}</VocabularyTerm> : <span key={`${part}-${index}`}>{part}</span>;
  })}</p>;
}

function ModelAnswer({ model, vocabulary, minimum }: { model: WritingModel; vocabulary: VocabularyItem[]; minimum: number }) {
  const words = countWords(model.paragraphs.join(" "));
  return <article className="model-answer"><div className="model-heading"><div><span className="eyebrow">MODEL ANSWER</span><h3>{model.title}</h3></div><span className={words >= minimum ? "word-badge ready" : "word-badge"}>{words} words</span></div>{model.chart && <BarChart data={model.chart} />}<div className="prompt-box"><strong>Task</strong><p>{model.prompt}</p></div><div className="essay-copy">{model.paragraphs.map((paragraph, index) => <HighlightedParagraph key={index} text={paragraph} vocabulary={vocabulary} />)}</div><p className="tap-hint"><Info size={15} /> Select a highlighted phrase to see its Vietnamese meaning, usage and example.</p></article>;
}

function VocabularyList({ items }: { items: VocabularyItem[] }) {
  return <div className="vocabulary-grid">{items.map((item) => <article key={item.term}><div><strong>{item.term}</strong><span>{item.meaning}</span></div><p><b>Usage</b>{item.usage}</p><p className="vocab-example"><b>Example</b>{item.example}</p></article>)}</div>;
}

function DraftArea({ id, label, hint, value, onChange, rows = 6, minimum, storageStatus }: { id: string; label: string; hint?: string; value: string; onChange: (value: string) => void; rows?: number; minimum?: number; storageStatus: DraftStorageStatus }) {
  const words = countWords(value);
  const storageCopy = storageStatus === "loading" ? "Loading saved draft…" : storageStatus === "saved" ? "Saved on this device" : "Not saved — device storage is unavailable";
  return <label className="draft-field" htmlFor={id}><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><textarea id={id} rows={rows} value={value} disabled={storageStatus === "loading"} onChange={(event) => onChange(event.target.value)} placeholder={storageStatus === "loading" ? "Loading your draft…" : "Write here…"} /><span aria-live="polite" className={[minimum && words >= minimum ? "draft-status ready" : "draft-status", storageStatus === "unsaved" ? "storage-error" : ""].join(" ")}><Save size={13} /> {storageCopy} · {words} words{minimum ? ` / minimum ${minimum}` : ""}</span></label>;
}

function CompletionButton({ complete, busy, onClick }: { complete: boolean; busy: boolean; onClick: () => void }) {
  return <button className={complete ? "button success writing-complete" : "button primary writing-complete"} disabled={busy} onClick={onClick}>{complete ? <><Check size={18} /> Part completed</> : <><BookOpenCheck size={18} /> Mark this part complete</>}</button>;
}

function SelfReview({ task }: { task: TaskId }) {
  const items = task === "task-1"
    ? ["I wrote at least 150 words in connected paragraphs.", "My introduction paraphrases the task.", "My overview selects the main patterns without listing every number.", "My details compare groups and use accurate figures."]
    : ["I wrote at least 250 words in connected paragraphs.", "My position is clear from the introduction to the conclusion.", "Each body paragraph develops one relevant reason.", "My examples support the argument rather than replace it."];
  return <fieldset className="self-review"><legend>Self-review before completion</legend>{items.map((item) => <label key={item}><input type="checkbox" /> <span>{item}</span></label>)}<p>This checklist supports reflection. It does not calculate or predict an IELTS band score.</p></fieldset>;
}

function TaskOnePractice({ drafts, setDraft, storageStatus }: { drafts: Drafts; setDraft: (key: string, value: string) => void; storageStatus: DraftStorageStatus }) {
  const guided = task1Practices[0];
  const independent = task1Practices[1];
  return <section className="lesson-section practice-section" id="task-1-practice"><span className="lesson-part-label">PART 2 · PRACTICE</span><div className="section-kicker"><PenLine size={18} /> Graduated practice</div><h2>Move from planning to a full response</h2><div className="practice-card"><span className="practice-level">STEP 1 · GUIDED</span><h3>{guided.title}</h3><BarChart data={guided.chart} /><div className="prompt-box"><strong>Task</strong><p>{guided.prompt}</p></div><div className="guided-grid"><DraftArea id="t1-intro" label="1. Introduction" hint="Paraphrase what the chart compares." value={drafts["t1-intro"] || ""} onChange={(value) => setDraft("t1-intro", value)} rows={3} storageStatus={storageStatus} /><DraftArea id="t1-overview" label="2. Overview" hint="Identify two or three main patterns; do not list all figures." value={drafts["t1-overview"] || ""} onChange={(value) => setDraft("t1-overview", value)} rows={3} storageStatus={storageStatus} /><DraftArea id="t1-detail-1" label="3. Detail paragraph 1" hint="Compare the strongest categories and support them with data." value={drafts["t1-detail-1"] || ""} onChange={(value) => setDraft("t1-detail-1", value)} storageStatus={storageStatus} /><DraftArea id="t1-detail-2" label="4. Detail paragraph 2" hint="Group the remaining categories and make relevant comparisons." value={drafts["t1-detail-2"] || ""} onChange={(value) => setDraft("t1-detail-2", value)} storageStatus={storageStatus} /></div></div><div className="practice-card independent"><span className="practice-level">STEP 2 · INDEPENDENT</span><h3>{independent.title}</h3><BarChart data={independent.chart} /><div className="prompt-box"><strong>Task</strong><p>{independent.prompt}</p></div><DraftArea id="t1-independent" label="Write your complete response" hint="Use full sentences and connected paragraphs. Aim to finish in about 20 minutes." value={drafts["t1-independent"] || ""} onChange={(value) => setDraft("t1-independent", value)} rows={14} minimum={150} storageStatus={storageStatus} /></div></section>;
}

function TaskTwoPractice({ drafts, setDraft, storageStatus }: { drafts: Drafts; setDraft: (key: string, value: string) => void; storageStatus: DraftStorageStatus }) {
  return <section className="lesson-section practice-section" id="task-2-practice"><span className="lesson-part-label">PART 2 · PRACTICE</span><div className="section-kicker"><PenLine size={18} /> Graduated practice</div><h2>Build an argument before writing independently</h2><div className="practice-card"><span className="practice-level">STEP 1 · GUIDED</span><h3>Plan the lesson question</h3><div className="prompt-box"><strong>Task</strong><p>{task2Prompt}</p></div><div className="guided-grid"><DraftArea id="t2-position" label="1. Position" hint="Answer the extent question directly in one sentence." value={drafts["t2-position"] || ""} onChange={(value) => setDraft("t2-position", value)} rows={3} storageStatus={storageStatus} /><DraftArea id="t2-reason-1" label="2. First main reason" hint="Write a topic sentence, explanation and relevant example." value={drafts["t2-reason-1"] || ""} onChange={(value) => setDraft("t2-reason-1", value)} storageStatus={storageStatus} /><DraftArea id="t2-reason-2" label="3. Second main reason" hint="Develop a distinct reason that supports the same position." value={drafts["t2-reason-2"] || ""} onChange={(value) => setDraft("t2-reason-2", value)} storageStatus={storageStatus} /><DraftArea id="t2-conclusion" label="4. Conclusion" hint="Restate your position without introducing a new argument." value={drafts["t2-conclusion"] || ""} onChange={(value) => setDraft("t2-conclusion", value)} rows={3} storageStatus={storageStatus} /></div></div><div className="practice-card independent"><span className="practice-level">STEP 2 · INDEPENDENT</span><h3>Write a new opinion essay</h3><div className="prompt-box"><strong>Task</strong><p>{task2IndependentPrompt}</p></div><DraftArea id="t2-independent" label="Write your complete response" hint="Use full sentences and connected paragraphs. Aim to finish in about 40 minutes." value={drafts["t2-independent"] || ""} onChange={(value) => setDraft("t2-independent", value)} rows={16} minimum={250} storageStatus={storageStatus} /></div></section>;
}

export function IELTSWritingLesson({ profile, unit, progress, onBack }: { profile: UserProfile; unit: Unit; progress?: UnitProgress; onBack: () => void }) {
  const [task, setTask] = useState<TaskId>("task-1");
  const [draftStore, setDraftStore] = useState<{ key: string; values: Drafts; status: DraftStorageStatus }>({ key: "", values: {}, status: "loading" });
  const [completed, setCompleted] = useState(progress?.completedActivityIds || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const storageKey = `lightway-writing-drafts-${profile.id}-${unit.id}`;

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}") as unknown;
        const values = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Drafts : {};
        setDraftStore({ key: storageKey, values, status: "saved" });
      } catch {
        setDraftStore({ key: storageKey, values: {}, status: "unsaved" });
      }
    });
    return () => { active = false; };
  }, [storageKey]);

  function setDraft(key: string, value: string) {
    if (draftStore.key !== storageKey) return;
    const values = { ...draftStore.values, [key]: value };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(values));
      setDraftStore({ key: storageKey, values, status: "saved" });
    } catch {
      setDraftStore({ key: storageKey, values, status: "unsaved" });
    }
  }

  async function completeTask(event?: FormEvent) {
    event?.preventDefault();
    const activityId = taskActivityIds[task];
    if (completed.includes(activityId)) return;
    setBusy(true);
    setError("");
    try {
      await setDoc(doc(db, "userProgress", profile.id, "units", unit.id), {
        completedActivityIds: arrayUnion(activityId),
        lastActivityId: activityId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setCompleted((current) => [...current, activityId]);
    } catch (reason) {
      setError(friendlyFirebaseError(reason));
    } finally {
      setBusy(false);
    }
  }

  const vocabulary = task === "task-1" ? task1Vocabulary : task2Vocabulary;
  const models = task === "task-1" ? task1Models : task2Models;
  const drafts = draftStore.key === storageKey ? draftStore.values : {};
  const storageStatus = draftStore.key === storageKey ? draftStore.status : "loading";
  const minimum = task === "task-1" ? 150 : 250;
  const isComplete = completed.includes(taskActivityIds[task]);

  return <main className="writing-lesson"><header className="writing-lesson-header"><button className="icon-button" onClick={onBack} aria-label="Back to course library"><ArrowLeft /></button><div><span className="eyebrow">IELTS · WRITING SKILLS</span><strong>{unit.title}</strong></div><span className="writing-progress">{completed.filter((id) => Object.values(taskActivityIds).includes(id)).length} / 2 parts</span></header><div className="writing-hero"><div><span className="eyebrow light">PILOT LESSON</span><h1>Compare clearly. Argue with purpose.</h1><p>Study complete models, open vocabulary explanations inside each essay, then move from guided planning to independent writing.</p></div><Sparkles aria-hidden="true" /></div><nav className="writing-task-tabs" aria-label="Lesson parts" role="tablist"><button role="tab" aria-selected={task === "task-1"} className={task === "task-1" ? "active" : ""} onClick={() => setTask("task-1")}><span>PART A</span><strong>Academic Writing Task 1</strong><small>Bar charts · minimum 150 words</small></button><button role="tab" aria-selected={task === "task-2"} className={task === "task-2" ? "active" : ""} onClick={() => setTask("task-2")}><span>PART B</span><strong>Writing Task 2</strong><small>Opinion essay · minimum 250 words</small></button></nav><div className="writing-lesson-body" role="tabpanel"><section className="lesson-section lesson-intro"><div className="section-kicker"><BarChart3 size={18} /> {task === "task-1" ? "Academic Writing Task 1" : "Writing Task 2"}</div><h2>{task === "task-1" ? "Select and compare the main features" : "Develop and support a clear opinion"}</h2><p>{task === "task-1" ? "Write at least 150 words in about 20 minutes. Use an academic or neutral style, include a clear overview and support the key comparisons with accurate figures." : "Write at least 250 words in about 40 minutes. Answer the exact question, maintain a clear position and develop relevant reasons with evidence or examples."}</p><div className="criteria-row"><span>Task {task === "task-1" ? "achievement" : "response"}</span><span>Coherence & cohesion</span><span>Lexical resource</span><span>Grammar range & accuracy</span></div></section><section className="lesson-section"><span className="lesson-part-label">PART 1 · MODELS & VOCABULARY</span><div className="section-kicker"><BookOpenCheck size={18} /> Two complete models</div><h2>Notice the structure and language choices</h2><div className="models-stack">{models.map((model) => <ModelAnswer key={model.title} model={model} vocabulary={vocabulary} minimum={minimum} />)}</div></section><section className="lesson-section"><span className="lesson-part-label">PART 1 · MODELS & VOCABULARY</span><div className="section-kicker"><Sparkles size={18} /> Vocabulary bank</div><h2>Meaning, usage and an example for every term</h2><VocabularyList items={vocabulary} /></section>{task === "task-1" ? <TaskOnePractice drafts={drafts} setDraft={setDraft} storageStatus={storageStatus} /> : <TaskTwoPractice drafts={drafts} setDraft={setDraft} storageStatus={storageStatus} />}<section className="lesson-section completion-section"><SelfReview task={task} />{error && <div className="form-error">{error}</div>}<CompletionButton complete={isComplete} busy={busy} onClick={() => void completeTask()} />{task === "task-1" && isComplete && <button className="button secondary next-part" onClick={() => { setTask("task-2"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Continue to Part B <ChevronRight size={18} /></button>}</section></div></main>;
}
