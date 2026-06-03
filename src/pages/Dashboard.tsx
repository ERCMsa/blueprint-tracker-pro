import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { isProjectOverdue, PROGRESS_TASK_KEYS } from "@/lib/projectUtils";

type ProjectRow = { id: string; date_impression_plans: string | null };
type TaskRow = { project_id: string; task_key: string; is_done: boolean; done_at: string | null };

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("projects").select("id, date_impression_plans"),
        supabase.from("project_tasks").select("project_id, task_key, is_done, done_at"),
      ]);
      setProjects(p ?? []);
      setTasks(t ?? []);
    })();
  }, []);

  const total = projects.length;
  const taskByProj = new Map<string, TaskRow[]>();
  tasks.forEach((t) => {
    const arr = taskByProj.get(t.project_id) ?? [];
    arr.push(t);
    taskByProj.set(t.project_id, arr);
  });
  const completed = projects.filter((p) => {
    const ts = taskByProj.get(p.id) ?? [];
    const done = new Set(ts.filter((x) => x.is_done).map((x) => x.task_key));
    return PROGRESS_TASK_KEYS.every((k) => done.has(k));
  }).length;
  const overdue = projects.filter((p) => isProjectOverdue(p.date_impression_plans, taskByProj.get(p.id) ?? [])).length;
  const inProgress = total - completed;

  const stats = [
    { label: "Total projets", value: total, icon: FolderKanban, color: "text-primary", bg: "bg-primary/10" },
    { label: "En cours", value: inProgress, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Terminés", value: completed, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "En retard", value: overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">Vue d'ensemble de vos projets d'ingénierie</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-6 bg-[image:var(--gradient-card)] shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="text-3xl font-bold mt-2">{s.value}</div>
                </div>
                <div className={`h-12 w-12 rounded-lg ${s.bg} grid place-items-center`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 bg-[image:var(--gradient-hero)] text-primary-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Gérez tous vos projets</h2>
              <p className="opacity-80 text-sm mt-1">Suivez les plans, achats et finitions en temps réel</p>
            </div>
            <Button asChild variant="secondary" size="lg">
              <Link to="/projects">Voir tous les projets</Link>
            </Button>
          </div>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
