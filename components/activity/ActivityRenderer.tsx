"use client";

import { FormEvent, useState } from "react";
import { BookOpen, Check, Lightbulb, MessageCircle, Mic, PenLine, Presentation, Send } from "lucide-react";
import { isCorrectAnswer } from "@/lib/learning";
import type { Activity } from "@/types";

const activityIcons = {
  teaching_slide: Presentation,
  multiple_choice: Check,
  fill_blank: PenLine,
  short_answer: MessageCircle,
  reading: BookOpen,
  speaking_prompt: Mic,
  writing_prompt: PenLine,
};

export function ActivityRenderer({ activity, interactive = false, selectedAnswer = "", submitted = false, revealed = false, pending = false, feedback = "class", onSubmit }: { activity: Activity; interactive?: boolean; selectedAnswer?: string; submitted?: boolean; revealed?: boolean; pending?: boolean; feedback?: "class" | "self"; onSubmit?: (answer: string) => void; }) {
  const [draft, setDraft] = useState({ activityId: activity.id, value: selectedAnswer });
  const answer = submitted ? selectedAnswer : draft.activityId === activity.id ? draft.value : selectedAnswer;
  const setAnswer = (value: string) => setDraft({ activityId: activity.id, value });
  const Icon = activityIcons[activity.type];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (answer.trim()) onSubmit?.(answer.trim());
  }

  const correct = revealed && submitted && isCorrectAnswer(activity, selectedAnswer || answer);
  return (
    <article className="activity-card">
      <div className="activity-kind"><span><Icon size={16} /></span>{activity.type.replaceAll("_", " ")}</div>
      <h2>{activity.title}</h2>
      <p className="activity-instructions">{activity.instructions}</p>
      <div className="activity-content">{activity.content}</div>
      {activity.type === "multiple_choice" && (
        <form onSubmit={submit} className="answer-form options-list">
          {activity.options?.map((option, index) => {
            const optionSelected = answer === option;
            const optionCorrect = revealed && option === activity.correctAnswer;
            const optionWrong = revealed && optionSelected && !optionCorrect;
            return <label className={[optionSelected ? "selected" : "", optionCorrect ? "correct" : "", optionWrong ? "wrong" : ""].join(" ")} key={option}><input type="radio" name="answer" value={option} checked={optionSelected} disabled={!interactive || submitted || revealed || pending} onChange={() => setAnswer(option)} /><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{optionCorrect && <Check size={18} />}</label>;
          })}
          {interactive && !submitted && !revealed && <button className="button primary answer-submit" disabled={pending || !answer} type="submit"><Send size={17} /> Submit answer</button>}
        </form>
      )}
      {interactive && ["fill_blank", "short_answer", "writing_prompt"].includes(activity.type) && (
        <form onSubmit={submit} className="answer-form text-answer"><textarea aria-label="Your answer" rows={activity.type === "writing_prompt" ? 5 : 2} placeholder="Type your answer…" value={answer} disabled={submitted || revealed || pending} onChange={(event) => setAnswer(event.target.value)} />{interactive && !submitted && !revealed && <button className="button primary" disabled={pending || !answer.trim()} type="submit"><Send size={17} /> Submit</button>}</form>
      )}
      {submitted && !revealed && <div className="submitted-note"><Check size={17} /> {feedback === "class" ? "Answer received. Your teacher will reveal the result." : "Answer saved."}</div>}
      {submitted && selectedAnswer && <p className="submitted-note">Your answer: {selectedAnswer}</p>}
      {revealed && activity.correctAnswer && <div className={correct ? "reveal-box correct" : "reveal-box"}><Lightbulb size={20} /><div><strong>{correct ? "Correct — well done." : `Correct answer: ${activity.correctAnswer}`}</strong><p>{activity.explanation}</p></div></div>}
    </article>
  );
}
