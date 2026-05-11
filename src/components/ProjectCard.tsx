import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/hooks/useAuth";
import { TASK_KEYS, TASK_LABELS, formatDate, formatDateTime, isOverdue, typeColorClass, progressColorClass } from "@/lib/projectUtils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { CalendarDays, MessageSquare, ChevronDown, Send, Lock, Calendar as CalendarIcon, Ban, FileCheck, Printer, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import UserChip from "./UserChip";

export type Project = {
  id: string;
  name: string;
  engineer_name: string;
  type: string;
  deadline: string;
  responsable: string;
  created_at: string;
  date_validation_projet: string | null;
  date_impression_plans: string | null;
};

type Task = {
  id: string; project_id: string; task_key: string; is_done: boolean;
  done_at: string | null; done_by: string | null;
  invalidated_by: string | null; invalidated_at: string | null; invalidation_reason: string | null;
};
type Comment = { id: string; project_id: string; user_id: string; content: string; created_at: string };

export default function ProjectCard({
  project,
  tasks: tasksProp,
  profile,
  profilesById,
}: {
  project: Project;
  tasks: Task[];
  profile: Profile;
  profilesById: Map<string, { full_name: string }>;
}) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasksProp);
  useEffect(() => { setLocalTasks(tasksProp); }, [tasksProp]);
  const tasks = localTasks;

  const overdue = isOverdue(project.deadline);
  const isResponsable = profile.full_name === project.responsable;
  const doneCount = tasks.filter((t) => t.is_done && !t.invalidated_at).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;
  const isViewer = profile.role === "viewer";
  const canCheck = profile.role === "boss" || isResponsable;
  const canInvalidate = profile.role === "boss" || isResponsable;
  const progressPct = Math.round((doneCount / 5) * 100);

  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isViewer) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true });
      if (mounted) setComments((data as Comment[]) ?? []);
    })();

    const channel = supabase
      .channel(`comments-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `project_id=eq.${project.id}` }, (payload) => {
        if (payload.eventType === "INSERT") setComments((c) => [...c, payload.new as Comment]);
        if (payload.eventType === "DELETE") setComments((c) => c.filter((x) => x.id !== (payload.old as Comment).id));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [project.id, isViewer]);

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    tasks.forEach((t) => m.set(t.task_key, t));
    return m;
  }, [tasks]);

  const toggleTask = async (task: Task) => {
    if (task.is_done || !canCheck || task.invalidated_at) return;
    const optimistic = { ...task, is_done: true, done_at: new Date().toISOString(), done_by: profile.id };
    setLocalTasks((ts) => ts.map((t) => (t.id === task.id ? optimistic : t)));
    const { error } = await supabase
      .from("project_tasks")
      .update({ is_done: true, done_at: optimistic.done_at, done_by: profile.id })
      .eq("id", task.id);
    if (error) {
      setLocalTasks((ts) => ts.map((t) => (t.id === task.id ? task : t)));
      toast.error("Action non autorisée");
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      project_id: project.id,
      user_id: profile.id,
      content: newComment.trim(),
    });
    setSubmitting(false);
    if (error) toast.error("Impossible d'envoyer le commentaire");
    else setNewComment("");
  };

  return (
    <Card className="overflow-hidden bg-[image:var(--gradient-card)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow flex flex-col">
      <div className="p-5 space-y-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">{project.name}</h3>
            <div className="text-sm text-muted-foreground mt-1 truncate">{project.engineer_name}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("border-0", typeColorClass(project.type))}>{project.type}</Badge>
            <DatesPopover project={project} overdue={overdue && !allDone} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-muted-foreground shrink-0">Responsable:</span>
            <div className="flex flex-wrap gap-1 min-w-0">
              <UserChip name={project.responsable} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-semibold">{progressPct}%</span>
          </div>
          <Progress value={progressPct} indicatorClassName={progressColorClass(progressPct)} className="h-2" />
        </div>

        <div className="space-y-2 pt-2 border-t">
          {TASK_KEYS.map((key) => {
            const t = taskMap.get(key);
            if (!t) return null;
            const invalidated = !!t.invalidated_at;
            const disabled = t.is_done || !canCheck || isViewer || invalidated;
            return (
              <div key={key} className="flex items-start gap-3 text-sm">
                {invalidated ? (
                  <Ban className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                ) : (
                  <Checkbox
                    checked={t.is_done}
                    disabled={disabled}
                    onCheckedChange={() => toggleTask(t)}
                    className={cn("mt-0.5", t.is_done && "data-[state=checked]:bg-success data-[state=checked]:border-success")}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("leading-snug", t.is_done && !invalidated && "line-through text-muted-foreground", invalidated && "line-through text-muted-foreground")}>
                      {TASK_LABELS[key]}
                    </span>
                    {invalidated && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Invalidé</Badge>}
                  </div>
                  {t.is_done && !invalidated && t.done_at && (
                    <div className="text-xs text-success mt-0.5">✓ Terminé le {formatDateTime(t.done_at)}</div>
                  )}
                  {invalidated && (
                    <div className="text-xs text-destructive mt-0.5">
                      Invalidé le {formatDateTime(t.invalidated_at)}
                      {t.invalidation_reason && <span className="text-muted-foreground"> — {t.invalidation_reason}</span>}
                    </div>
                  )}
                </div>
                {!canCheck && !isViewer && !t.is_done && !invalidated && <Lock className="h-3.5 w-3.5 text-muted-foreground mt-1" />}
                {canInvalidate && !invalidated && (
                  <InvalidateButton task={t} userId={profile.id} onLocal={(updated) => setLocalTasks((ts) => ts.map((x) => x.id === updated.id ? updated : x))} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isViewer && (
        <div className="border-t bg-muted/30">
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/60 transition"
            onClick={() => setShowComments((s) => !s)}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Commentaires ({comments.length})
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showComments && "rotate-180")} />
          </button>

          {showComments && (
            <div className="p-4 pt-0 space-y-3">
              <div className="max-h-60 overflow-y-auto space-y-3">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Aucun commentaire pour le moment</p>
                )}
                {comments.map((c) => {
                  const author = profilesById.get(c.user_id)?.full_name ?? "Utilisateur";
                  return (
                    <div key={c.id} className="flex gap-2 text-sm">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {author.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-card rounded-md px-3 py-2 border">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-xs">{author}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Textarea
                  placeholder="Écrire un commentaire..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="min-h-[40px] resize-none"
                />
                <Button size="icon" onClick={submitComment} disabled={submitting || !newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DatesPopover({ project, overdue }: { project: Project; overdue: boolean }) {
  const rows = [
    { icon: CalendarPlus, label: "Date de création", value: project.created_at },
    { icon: FileCheck, label: "Date de validation", value: project.date_validation_projet },
    { icon: Printer, label: "Date d'impression des plans", value: project.date_impression_plans },
    { icon: CalendarDays, label: "Date limite", value: project.deadline },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className={cn("h-8 w-8", overdue && "border-destructive text-destructive")}>
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <ul className="divide-y">
          {rows.map(({ icon: Icon, label, value }) => (
            <li key={label} className="flex items-center justify-between gap-3 py-2 px-1">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
              <span className="text-sm font-medium">{value ? formatDate(value) : "—"}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function InvalidateButton({ task, userId, onLocal }: { task: Task; userId: string; onLocal: (t: Task) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("project_tasks")
      .update({ invalidated_by: userId, invalidated_at: now, invalidation_reason: reason.trim() || null })
      .eq("id", task.id);
    setBusy(false);
    if (error) {
      toast.error("Action non autorisée");
      return;
    }
    onLocal({ ...task, invalidated_by: userId, invalidated_at: now, invalidation_reason: reason.trim() || null });
    setOpen(false);
    setReason("");
    toast.success("Tâche invalidée");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
          <Ban className="h-3.5 w-3.5 mr-1" />
          Invalider
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2">
        <div className="text-sm font-medium">Invalider cette tâche</div>
        <Input placeholder="Raison (optionnel)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="destructive" size="sm" onClick={submit} disabled={busy}>Confirmer</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
