import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function DateField({ value, onChange, placeholder = "Choisir" }: { value?: Date; onChange: (d?: Date) => void; placeholder?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus locale={fr} className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

export default function CreateProjectDialog({ onCreated, userId }: { onCreated: () => void; userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [type, setType] = useState<string>("");
  const [dateValidation, setDateValidation] = useState<Date>();
  const [dateImpression, setDateImpression] = useState<Date>();
  const [responsable, setResponsable] = useState("");
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .then(({ data, error }) => {
        if (error) { toast.error(error.message); return; }
        setUsers(data || []);
      });
  }, [open]);

  const reset = () => {
    setName(""); setReference(""); setType(""); setDeadline(undefined); setResponsable("");
    setDateValidation(undefined); setDateImpression(undefined);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline) { toast.error("Sélectionnez une date limite"); return; }
    if (!dateValidation) { toast.error("Sélectionnez la date de validation du projet"); return; }
    if (!dateImpression) { toast.error("Sélectionnez la date d'impression des plans"); return; }
    if (!responsable) { toast.error("Sélectionnez un responsable"); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (dateValidation < today) { toast.error("La date de validation doit être après la date de création"); return; }
    if (dateImpression < today) { toast.error("La date d'impression doit être après la date de création"); return; }

    setLoading(true);
    const { error } = await supabase.from("projects").insert({
      name, engineer_name: reference, type, deadline: deadline.toISOString().slice(0, 10),
      responsable, created_by: userId,
      date_validation_projet: dateValidation.toISOString().slice(0, 10),
      date_impression_plans: dateImpression.toISOString().slice(0, 10),
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du projet</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Référence</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Date limite</Label>
              <DateField value={deadline} onChange={setDeadline} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de validation du projet</Label>
              <DateField value={dateValidation} onChange={setDateValidation} />
            </div>
            <div className="space-y-2">
              <Label>Date d'impression des plans</Label>
              <DateField value={dateImpression} onChange={setDateImpression} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsable</Label>
            <Select value={responsable} onValueChange={setResponsable}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
