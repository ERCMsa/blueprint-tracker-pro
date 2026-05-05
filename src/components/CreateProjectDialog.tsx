import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PROJECT_TYPES } from "@/lib/projectUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CreateProjectDialog({ onCreated, userId }: { onCreated: () => void; userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [engineer, setEngineer] = useState("");
  const [type, setType] = useState<string>("Structure");
  const [deadline, setDeadline] = useState<Date>();
  const [responsable, setResponsable] = useState("");

  const reset = () => {
    setName(""); setEngineer(""); setType("Structure"); setDeadline(undefined); setResponsable("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline) { toast.error("Sélectionnez une date limite"); return; }
    setLoading(true);
    const { error } = await supabase.from("projects").insert({
      name, engineer_name: engineer, type, deadline: deadline.toISOString().slice(0, 10),
      responsable, created_by: userId,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Projet créé");
    reset();
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Nouveau projet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du projet</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Nom de l'ingénieur</Label>
            <Input value={engineer} onChange={(e) => setEngineer(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date limite</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "dd/MM/yyyy") : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus locale={fr} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsable (nom complet)</Label>
            <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} required placeholder="Nom complet du responsable" />
            <p className="text-xs text-muted-foreground">Doit correspondre au nom complet de l'utilisateur pour qu'il puisse cocher les tâches.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
