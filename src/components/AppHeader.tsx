import { Link, useNavigate, useLocation } from "react-router-dom";
import { Building2, LogOut, Users, LayoutDashboard, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function AppHeader({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItem = (to: string, icon: React.ReactNode, label: string) => (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        location.pathname === to
          ? "bg-primary text-primary-foreground"
          : "text-foreground/80 hover:bg-secondary"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to={profile.role === "engineer" ? "/projects" : "/dashboard"} className="flex items-center gap-2">
            <img src="https://ercmsalhi.com/wp-content/uploads/2022/03/logo-ERCM.png" alt="Logo" className="w-20" />
        </Link>
        <nav className="flex items-center gap-1">
          {(profile.role === "boss" || profile.role === "viewer") && navItem("/dashboard", <LayoutDashboard className="h-4 w-4" />, "Tableau de bord")}
          {navItem("/projects", <FolderKanban className="h-4 w-4" />, "Projets")}
          {profile.role === "boss" && navItem("/users", <Users className="h-4 w-4" />, "Utilisateurs")}
        </nav>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground capitalize">{profile.role === "boss" ? "Responsable" : profile.role === "viewer" ? "Observateur" : "Ingénieur"}</div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
