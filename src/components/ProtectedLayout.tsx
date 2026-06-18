import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "./AppHeader";
import { Loader2 } from "lucide-react";

export default function ProtectedLayout({
  children,
  requireBoss = false,
}: {
  children: React.ReactNode;
  requireBoss?: boolean;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        Chargement du profil...
      </div>
    );
  }
  if (requireBoss && profile.role !== "boss") return <Navigate to="/projects" replace />;

  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />
      <main className="md:container py-8">{children}</main>
    </div>
  );
}
