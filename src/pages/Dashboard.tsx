import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Plus, 
  Home, 
  Sun, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Loader2,
  LogOut,
  Settings
} from "lucide-react";
import soloLogo from "@/assets/solo-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/supabase/clientUntyped";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  average_consumption: number;
  solar_systems: SolarSystem[];
}

interface SolarSystem {
  id: string;
  total_power_kw: number;
  expected_monthly_generation: number;
  number_of_modules: number;
}

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await db("properties")
        .select(`
          *,
          solar_systems (
            id,
            total_power_kw,
            expected_monthly_generation,
            number_of_modules
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas propriedades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <img src={soloLogo} alt="Solo Energia" className="h-8 w-auto" />
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">
            Olá, bem-vindo! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas propriedades e acompanhe sua energia solar
          </p>
        </motion.div>

        {/* Properties Grid */}
        {properties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Home className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma propriedade cadastrada
            </h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Cadastre sua primeira propriedade e sistema solar para começar a
              monitorar sua energia.
            </p>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => navigate("/property/new")}
            >
              <Plus className="h-5 w-5" />
              Cadastrar Propriedade
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Suas Propriedades
              </h2>
              <Button
                variant="gradient"
                onClick={() => navigate("/property/new")}
              >
                <Plus className="h-4 w-4" />
                Nova Propriedade
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="stat-card cursor-pointer group"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center">
                      <Home className="h-6 w-6 text-white" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <h3 className="font-semibold text-foreground text-lg mb-1">
                    {property.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {property.city}, {property.state}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Sun className="h-4 w-4" />
                        <span className="text-xs">Sistema</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        {property.solar_systems?.[0]?.total_power_kw?.toFixed(1) || 0} kWp
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs">Geração Est.</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        {property.solar_systems?.[0]?.expected_monthly_generation?.toFixed(0) || 0} kWh
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
