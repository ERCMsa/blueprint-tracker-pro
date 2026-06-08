import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/projectUtils";
import { Profile } from "@/hooks/useAuth";

export type Issue = {
  id: string;
  project_id: string;
  content: string;
  created_by: string;
  created_at: string;
};

export default function IssuesDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  profile,
  profilesById,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  profile: Profile;
  profilesById: Map<string, { full_name: string }>;
}) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isBoss = profile.role === "boss";

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("issues" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) toast.error(error.message);
      else setIssues(((data as unknown) as Issue[]) ?? []);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`issues-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues", filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setIssues((prev) => [payload.new as Issue, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setIssues((prev) => prev.filter((i) => i.id !== (payload.old as Issue).id));
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [open, projectId]);

  const submit = async () => {
    const text = content.trim();
    if (!text) return;
    setSubmitting(true);
    const { error } = await supabase.from("issues" as any).insert({
      project_id: projectId,
      content: text,
      created_by: profile.id,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      setContent("");
      toast.success("Issue créée");
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("issues" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Issues — {projectName}
          </DialogTitle>
        </DialogHeader>

        {isBoss && (
          <div className="space-y-2 pb-3 border-b">
            <Textarea
              placeholder="Décrire une nouvelle issue..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={submitting || !content.trim()} size="sm">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="py-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : issues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune issue pour ce projet.</p>
          ) : (
            issues.map((it) => {
              const author = profilesById.get(it.created_by)?.full_name ?? "Utilisateur";
              return (
                <div key={it.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{author}</span>
                      <span className="mx-1.5">·</span>
                      <span>{formatDateTime(it.created_at)}</span>
                    </div>
                    {isBoss && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(it.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{it.content}</p>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
