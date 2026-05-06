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
import { CalendarDays, MessageSquare, User, ChevronDown, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Project = {
  id: string;
  name: string;
  engineer_name: string;
  type: string;
  deadline: string;
  responsable: string;
  created_at: string;
};

type Task = { id: string; project_id: string; task_key: string; is_done: boolean; done_at: string | null; done_by: string | null };
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
  const doneCount = tasks.filter((t) => t.is_done).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;
  const isViewer = profile.role === "viewer";
  const canCheck = profile.role === "boss" || profile.full_name === project.responsable;
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
    if (task.is_done || !canCheck) return;
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
    if (error) {
      toast.error("Impossible d'envoyer le commentaire");
    } else {
      setNewComment("");
    }
  };

  return (
    <Card className="overflow-hidden bg-[image:var(--gradient-card)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow flex flex-col">
      <div className="p-5 space-y-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">{project.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{project.engineer_name}</span>
            </div>
          </div>
          <Badge className={cn("shrink-0 border-0", typeColorClass(project.type))}>{project.type}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Responsable:</span>
            <span className="font-medium">{project.responsable}</span>
          </div>
          <div className={cn("flex items-center gap-1.5 font-medium", overdue && !allDone ? "text-destructive" : "text-foreground")}>
            <CalendarDays className="h-4 w-4" />
            {formatDate(project.deadline)}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Créé le : {formatDate(project.created_at)}</div>

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
            const disabled = t.is_done || !canCheck || isViewer;
            return (
              <div key={key} className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={t.is_done}
                  disabled={disabled}
                  onCheckedChange={() => toggleTask(t)}
                  className={cn("mt-0.5", t.is_done && "data-[state=checked]:bg-success data-[state=checked]:border-success")}
                />
                <div className="flex-1 min-w-0">
                  <div className={cn("leading-snug", t.is_done && "line-through text-muted-foreground")}>
                    {TASK_LABELS[key]}
                  </div>
                  {t.is_done && t.done_at && (
                    <div className="text-xs text-success mt-0.5">✓ Terminé le {formatDateTime(t.done_at)}</div>
                  )}
                </div>
                {!canCheck && !isViewer && !t.is_done && <Lock className="h-3.5 w-3.5 text-muted-foreground mt-1" />}
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
