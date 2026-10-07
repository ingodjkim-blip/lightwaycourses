"use client";

import { useEffect, useState } from "react";
import { loadCurriculum } from "@/lib/curriculum";
import type { CurriculumData } from "@/types";

export function useCurriculum(enabled = true) {
  const [data, setData] = useState<CurriculumData | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadCurriculum().then((result) => {
      if (alive) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [enabled]);

  return { curriculum: data, curriculumLoading: loading };
}
