import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
        navigate(data?.role === "boss" ? "/dashboard" : "/projects", { replace: true });
      }
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const email = `${username.trim().toLowerCase()}@ercmsa.internal`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Identifiants incorrects");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    toast.success("Connexion réussie");
    navigate(profile?.role === "boss" ? "/dashboard" : "/projects", { replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[image:var(--gradient-hero)] text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(45deg, white 0 1px, transparent 1px 24px)",
        }} />
        <div className="relative flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur grid place-items-center">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="text-2xl font-bold">ERCMsa</div>
            <div className="text-sm opacity-80">Plateforme de gestion d'ingénierie</div>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-5xl font-bold leading-tight">
            Pilotez vos<br />projets de<br /><span className="text-accent">construction</span>
          </h1>
          <p className="text-lg opacity-80 max-w-md">
            Suivi en temps réel des plans, achats et finitions. Coordination entre ingénieurs et responsables.
          </p>
        </div>
        <div className="relative text-sm opacity-60">© {new Date().getFullYear()} ERCMsa — Tous droits réservés</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elevated)]">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-md bg-[image:var(--gradient-hero)] grid place-items-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="font-bold text-lg">ERCMsa</div>
          </div>
          <h2 className="text-2xl font-bold">Connexion</h2>
          <p className="text-sm text-muted-foreground mt-1">Accédez à votre espace de travail</p>

          <form onSubmit={onSubmit} className="space-y-4 mt-8">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: jdupont"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Se connecter
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Pas de compte ? Contactez votre responsable.
          </p>
        </Card>
      </div>
    </div>
  );
}
