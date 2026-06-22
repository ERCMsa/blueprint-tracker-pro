export const TASK_LABELS: Record<string, string> = {
  plan_created: "Le plan est créé",
  achat_profile: "Liste achat profilé est terminée",
  achat_boulonnerie: "Liste achat boulonnerie est terminée",
  piece_finition: "Liste des habillage pièces finition est terminée",
  cnc_finish: "La fiche CNC est créée",
};

export const SUBTASK_LABELS: Record<string, string> = {
  creer: "Créer",
  transmettre: "Transmettre",
};

// Subtask weights as fraction of parent task progress
export const SUBTASK_WEIGHTS: Record<string, number> = {
  creer: 0.8,
  transmettre: 0.2,
};

// Parent task definitions in display order
export type ParentTaskDef = {
  key: string;
  subtaskKeys: string[] | null; // null => simple single task (uses key itself)
  excludeFromProgress?: boolean;
  // Custom weight (fraction of total progress). If omitted, equal share across non-excluded parents.
  progressWeight?: number;
  // Per-subtask weight contribution to this parent's own progress.
  // For example, plan_created counts only "creer" toward progress (transmettre has weight 0).
  subtaskProgressWeights?: Record<string, number>;
};

export const PARENT_TASKS: ParentTaskDef[] = [
  {
    key: "plan_created",
    subtaskKeys: ["plan_created_creer", "plan_created_transmettre"],
    progressWeight: 0.5,
    // Only "creer" contributes to progress; "transmettre" still tracked but excluded.
    subtaskProgressWeights: { creer: 1, transmettre: 0 },
  },
  { key: "achat_profile", subtaskKeys: ["achat_profile_creer", "achat_profile_transmettre"] },
  { key: "achat_boulonnerie", subtaskKeys: ["achat_boulonnerie_creer", "achat_boulonnerie_transmettre"] },
  { key: "piece_finition", subtaskKeys: ["piece_finition_creer", "piece_finition_transmettre"], excludeFromProgress: true },
  { key: "cnc_finish", subtaskKeys: null },
];

// All task_key values that should exist in the DB for a project
export const TASK_KEYS = PARENT_TASKS.flatMap((p) => p.subtaskKeys ?? [p.key]);

// Keys counted in overall project progress (excludes piece_finition family)
export const PROGRESS_TASK_KEYS = PARENT_TASKS
  .filter((p) => !p.excludeFromProgress)
  .flatMap((p) => {
    if (!p.subtaskKeys) return [p.key];
    // Only include subtasks that actually carry weight toward progress
    if (p.subtaskProgressWeights) {
      return p.subtaskKeys.filter((sk) => {
        const suffix = sk.split("_").pop() as string;
        return (p.subtaskProgressWeights?.[suffix] ?? 0) > 0;
      });
    }
    return p.subtaskKeys;
  });

// Compute project progress 0..1 given a set of done task_keys
export function computeProgress(doneKeys: Set<string>): number {
  const units = PARENT_TASKS.filter((p) => !p.excludeFromProgress);
  if (units.length === 0) return 0;

  // Determine remaining weight to share among parents without an explicit weight
  const explicitTotal = units.reduce((s, p) => s + (p.progressWeight ?? 0), 0);
  const autoCount = units.filter((p) => p.progressWeight === undefined).length;
  const autoWeight = autoCount > 0 ? Math.max(0, 1 - explicitTotal) / autoCount : 0;

  let sum = 0;
  for (const p of units) {
    const parentWeight = p.progressWeight ?? autoWeight;
    if (parentWeight <= 0) continue;

    if (!p.subtaskKeys) {
      if (doneKeys.has(p.key)) sum += parentWeight;
      continue;
    }
    // Has subtasks: each subtask contributes a share of parentWeight.
    const weights = p.subtaskProgressWeights
      ?? Object.fromEntries(p.subtaskKeys.map((sk) => {
        const suffix = sk.split("_").pop() as string;
        return [suffix, SUBTASK_WEIGHTS[suffix] ?? 0];
      }));
    for (const sk of p.subtaskKeys) {
      const suffix = sk.split("_").pop() as string;
      const w = weights[suffix] ?? 0;
      if (w > 0 && doneKeys.has(sk)) sum += parentWeight * w;
    }
  }
  return sum;
}

export const PROJECT_TYPES = ["Structure", "Architecture", "MEP", "VRD", "Autre"] as const;

export function typeColorClass(type: string) {
  switch (type) {
    case "Structure": return "bg-type-structure text-white";
    case "Architecture": return "bg-type-architecture text-white";
    case "MEP": return "bg-type-mep text-white";
    case "VRD": return "bg-type-vrd text-white";
    default: return "bg-type-autre text-white";
  }
}

// Parse a date value safely as local time, avoiding the UTC-midnight off-by-one bug.
// Accepts: Date, ISO timestamp ("...T..."), or date-only string "YYYY-MM-DD".
function parseLocalDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // Date-only string: build using local constructor.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(d);
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = parseLocalDate(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

// Format a JS Date as "YYYY-MM-DD" in local time (safe for storing into a `date` column).
export function formatDateForStorage(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isOverdue(date: string | null | undefined) {
  if (!date) return false;
  const d = parseLocalDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

// Project is "en retard" when "Le plan est créé - Transmettre" was validated
// AFTER date_impression_plans, or is not yet validated and today is past that date.
export function isProjectOverdue(
  dateImpression: string | null | undefined,
  tasks: { task_key: string; is_done: boolean; done_at: string | null }[],
): boolean {
  if (!dateImpression) return false;
  const deadline = parseLocalDate(dateImpression);
  deadline.setHours(0, 0, 0, 0);
  const t = tasks.find((x) => x.task_key === "plan_created_creer");
  if (t && t.is_done && t.done_at) {
    const doneAt = new Date(t.done_at);
    doneAt.setHours(0, 0, 0, 0);
    return doneAt > deadline;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > deadline;
}

export function progressColorClass(pct: number) {
  if (pct === 0) return "bg-destructive";
  if (pct < 50) return "bg-orange-500";
  if (pct < 100) return "bg-blue-500";
  return "bg-success";
}
