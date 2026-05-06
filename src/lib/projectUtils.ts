export const TASK_LABELS: Record<string, string> = {
  plan_created: "Le plan est créé",
  achat_profile: "Liste achat profilé est terminée",
  achat_boulonnerie: "Liste achat boulonnerie est terminée",
  piece_finition: "Liste des pièces finition est terminée",
  cnc_finish: "La partie CNC est finie",
};

export const TASK_KEYS = ["plan_created", "achat_profile", "achat_boulonnerie", "piece_finition", "cnc_finish"];

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

export function isOverdue(deadline: string) {
  return new Date(deadline) < new Date(new Date().toDateString());
}

export function progressColorClass(pct: number) {
  if (pct === 0) return "bg-destructive";
  if (pct < 50) return "bg-orange-500";
  if (pct < 100) return "bg-blue-500";
  return "bg-success";
}
