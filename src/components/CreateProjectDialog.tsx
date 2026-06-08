import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Loader2, ImageIcon, X, Upload } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateForStorage } from "@/lib/projectUtils";

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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setName(""); setReference(""); setType(""); setResponsable("");
    setDateValidation(undefined); setDateImpression(undefined);
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const clearCover = () => {
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateValidation) { toast.error("Sélectionnez la date de validation du projet"); return; }
    if (!dateImpression) { toast.error("Sélectionnez la date de soumission des plans"); return; }
    if (!responsable) { toast.error("Sélectionnez un responsable"); return; }

    setLoading(true);
    const { data: inserted, error } = await supabase.from("projects").insert({
      name, engineer_name: reference, type,
      responsable, created_by: userId,
      date_validation_projet: formatDateForStorage(dateValidation),
      date_impression_plans: formatDateForStorage(dateImpression),
    }).select("id").single();

    if (error || !inserted) {
      setLoading(false);
      toast.error(error?.message || "Erreur création");
      return;
    }

    if (coverFile) {
      const ext = coverFile.name.split(".").pop() || "jpg";
      const path = `project-${inserted.id}/cover.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, coverFile, { upsert: true, contentType: coverFile.type });
      if (upErr) {
        toast.error("Image non téléversée: " + upErr.message);
      } else {
        const { data: pub } = supabase.storage.from("project-images").getPublicUrl(path);
        await supabase.from("projects").update({ cover_image_url: pub.publicUrl }).eq("id", inserted.id);
      }
    }

    setLoading(false);
    toast.success("Projet créé");
    reset();
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Nouveau projet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Image de couverture (optionnel)</Label>
            {coverPreview ? (
              <div className="relative w-full h-40 rounded-md overflow-hidden border bg-muted">
                <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={clearCover}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 rounded-md border-2 border-dashed border-input bg-muted/30 hover:bg-muted/60 transition flex flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">Cliquer pour téléverser une image</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <div className="space-y-2">
            <Label>Nom du projet</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Référence</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de validation du projet</Label>
              <DateField value={dateValidation} onChange={setDateValidation} />
            </div>
            <div className="space-y-2">
              <Label>Date de soumission des plans</Label>
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
