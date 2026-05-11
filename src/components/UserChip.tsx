import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
];

function hashIndex(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE.length;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return letters.toUpperCase();
}

export default function UserChip({ name, className }: { name: string; className?: string }) {
  if (!name) return null;
  const color = PALETTE[hashIndex(name)];
  const display = name.length > 12 ? name.slice(0, 12) + "…" : name;
  return (
    <span
      title={name}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted/60 border pl-0.5 pr-2.5 py-0.5 text-xs font-medium max-w-full",
        className
      )}
    >
      <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white", color)}>
        {initials(name)}
      </span>
      <span className="truncate">{display}</span>
    </span>
  );
}
