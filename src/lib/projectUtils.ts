export const TASK_LABELS: Record<string, string> = {
  plan_created: "Le plan est créé",
  achat_profile: "Liste achat profilé est terminée",
  achat_boulonnerie: "Liste achat boulonnerie est terminée",
  piece_finition: "Liste des habillage pièces finition est terminée",
  cnc_finish: "La fiche CNC est finie",
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
};

export const PARENT_TASKS: ParentTaskDef[] = [
  { key: "plan_created", subtaskKeys: ["plan_created_creer", "plan_created_transmettre"] },
  { key: "achat_profile", subtaskKeys: ["achat_profile_creer", "achat_profile_transmettre"] },
  { key: "achat_boulonnerie", subtaskKeys: ["achat_boulonnerie_creer", "achat_boulonnerie_transmettre"] },
  { key: "piece_finition", subtaskKeys: ["piece_finition_creer", "piece_finition_transmettre"], excludeFromProgress: true },
  { key: "cnc_finish", subtaskKeys: ["cnc_finish_creer", "cnc_finish_transmettre"] },
];

// All task_key values that should exist in the DB for a project
export const TASK_KEYS = PARENT_TASKS.flatMap((p) => p.subtaskKeys ?? [p.key]);

// Keys counted in overall project progress (excludes piece_finition family)
export const PROGRESS_TASK_KEYS = PARENT_TASKS
  .filter((p) => !p.excludeFromProgress)
  .flatMap((p) => p.subtaskKeys ?? [p.key]);

// Compute project progress 0..1 given a set of done task_keys
export function computeProgress(doneKeys: Set<string>): number {
  const units = PARENT_TASKS.filter((p) => !p.excludeFromProgress);
  if (units.length === 0) return 0;
  let sum = 0;
  for (const p of units) {
    if (p.subtaskKeys) {
      for (const sk of p.subtaskKeys) {
        const suffix = sk.split("_").pop() as string;
        const weight = SUBTASK_WEIGHTS[suffix] ?? 0;
        if (doneKeys.has(sk)) sum += weight;
      }
    } else if (doneKeys.has(p.key)) {
      sum += 1;
    }
  }
  return sum / units.length;
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

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
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

export function isOverdue(date: string | null | undefined) {
  if (!date) return false;
  const d = new Date(date);
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
  const deadline = new Date(dateImpression);
  deadline.setHours(0, 0, 0, 0);
  const t = tasks.find((x) => x.task_key === "plan_created_transmettre");
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
