import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProtectedLayout from "@/components/ProtectedLayout";
import ProjectCard, { Project } from "@/components/ProjectCard";
import CreateProjectDialog from "@/components/CreateProjectDialog";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FolderOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Task = { id: string; project_id: string; task_key: string; is_done: boolean; done_at: string | null; done_by: string | null; invalidated_by: string | null; invalidated_at: string | null; invalidation_reason: string | null };

export default function Projects() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, { full_name: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: p }, { data: t }, { data: pr }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("project_tasks").select("*"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setProjects((p as Project[]) ?? []);
    setTasks((t as Task[]) ?? []);
    const m = new Map<string, { full_name: string }>();
    (pr ?? []).forEach((x: any) => m.set(x.id, { full_name: x.full_name }));
    setProfilesMap(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("projects-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setTasks((ts) => ts.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t)));
        } else if (payload.eventType === "INSERT") {
          setTasks((ts) => [...ts, payload.new as Task]);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  if (!profile) return null;

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projets</h1>
            <p className="text-muted-foreground mt-1">{projects.length} projet{projects.length > 1 ? "s" : ""} au total</p>
          </div>
          {profile.role === "boss" && <CreateProjectDialog onCreated={load} userId={profile.id} />}
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-4 font-medium">Aucun projet pour le moment</p>
            <p className="text-sm text-muted-foreground">{profile.role === "boss" ? "Créez votre premier projet pour commencer" : "Aucun projet n'a encore été créé"}</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                tasks={tasks.filter((t) => t.project_id === p.id)}
                profile={profile}
                profilesById={profilesMap}
                onDeleted={load}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
