import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { 
  ArrowLeft, 
  ArrowRight,
  Home,
  MapPin,
  Zap,
  Sun,
  Wrench,
  Loader2,
  Check
} from "lucide-react";
import soloLogo from "@/assets/solo-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const propertySchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  address: z.string().min(5, "Endereço deve ter no mínimo 5 caracteres"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  zipCode: z.string().optional(),
  averageConsumption: z.number().min(0, "Consumo deve ser positivo"),
});

const solarSystemSchema = z.object({
  numberOfModules: z.number().min(1, "Número de módulos deve ser pelo menos 1"),
  modulePowerWatts: z.number().min(100, "Potência deve ser pelo menos 100W"),
  moduleBrand: z.string().optional(),
  inverterBrand: z.string().optional(),
  inverterPowerWatts: z.number().optional(),
  installationYear: z.number().min(2000, "Ano inválido").max(new Date().getFullYear(), "Ano inválido"),
  systemCost: z.number().optional(),
  lastMaintenanceDate: z.string().optional(),
});

export default function PropertyForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Property fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [averageConsumption, setAverageConsumption] = useState("");

  // Solar system fields
  const [numberOfModules, setNumberOfModules] = useState("");
  const [modulePowerWatts, setModulePowerWatts] = useState("");
  const [moduleBrand, setModuleBrand] = useState("");
  const [inverterBrand, setInverterBrand] = useState("");
  const [inverterPowerWatts, setInverterPowerWatts] = useState("");
  const [installationYear, setInstallationYear] = useState("");
  const [systemCost, setSystemCost] = useState("");
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState("");

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const validateStep1 = () => {
    const result = propertySchema.safeParse({
      name,
      address,
      city,
      state,
      zipCode,
      averageConsumption: parseFloat(averageConsumption) || 0,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    const result = solarSystemSchema.safeParse({
      numberOfModules: parseInt(numberOfModules) || 0,
      modulePowerWatts: parseFloat(modulePowerWatts) || 0,
      moduleBrand,
      inverterBrand,
      inverterPowerWatts: parseFloat(inverterPowerWatts) || undefined,
      installationYear: parseInt(installationYear) || 0,
      systemCost: parseFloat(systemCost) || undefined,
      lastMaintenanceDate: lastMaintenanceDate || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    if (!user) return;

    setIsLoading(true);

    try {
      // Create property
      const { data: property, error: propertyError } = await (supabase
        .from("properties" as any)
        .insert({
          owner_id: user.id,
          name,
          address,
          city,
          state,
          zip_code: zipCode || null,
          average_consumption: parseFloat(averageConsumption) || 0,
        })
        .select()
        .single() as any);

      if (propertyError) throw propertyError;
      if (!property) throw new Error("Failed to create property");

      // Create solar system
      const { error: systemError } = await (supabase
        .from("solar_systems" as any)
        .insert({
          property_id: property.id,
          number_of_modules: parseInt(numberOfModules),
          module_power_watts: parseFloat(modulePowerWatts),
          module_brand: moduleBrand || null,
          inverter_brand: inverterBrand || null,
          inverter_power_watts: parseFloat(inverterPowerWatts) || null,
          installation_year: parseInt(installationYear),
          system_cost: parseFloat(systemCost) || null,
          last_maintenance_date: lastMaintenanceDate || null,
        }) as any);

      if (systemError) throw systemError;

      toast({
        title: "Sucesso!",
        description: "Propriedade e sistema cadastrados com sucesso",
      });

      navigate(`/property/${property.id}`);
    } catch (error: any) {
      console.error("Error creating property:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cadastrar a propriedade",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate expected values
  const totalPowerKw = ((parseInt(numberOfModules) || 0) * (parseFloat(modulePowerWatts) || 0)) / 1000;
  const expectedGeneration = totalPowerKw * 30 * 4.5;

  if (authLoading) {
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
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={soloLogo} alt="Solo Energia" className="h-8 w-auto" />
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step > 1 ? "gradient-bg text-white" : step === 1 ? "border-2 border-primary text-primary" : "border-2 border-muted-foreground"
            }`}>
              {step > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <span className="font-medium hidden sm:inline">Propriedade</span>
          </div>
          <div className="h-px w-12 bg-border" />
          <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step > 2 ? "gradient-bg text-white" : step === 2 ? "border-2 border-primary text-primary" : "border-2 border-muted-foreground"
            }`}>
              {step > 2 ? <Check className="h-4 w-4" /> : "2"}
            </div>
            <span className="font-medium hidden sm:inline">Sistema Solar</span>
          </div>
        </div>

        {/* Step 1: Property Details */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-6">
              <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                <Home className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Dados da Propriedade
              </h1>
              <p className="text-muted-foreground mt-1">
                Informe os dados básicos da sua propriedade
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da propriedade</Label>
                <Input
                  id="name"
                  placeholder="Ex: Casa Principal, Sítio, etc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="Rua, número, bairro"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    placeholder="UF"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                  />
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP (opcional)</Label>
                <Input
                  id="zipCode"
                  placeholder="00000-000"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="averageConsumption">Consumo médio mensal (kWh)</Label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="averageConsumption"
                    type="number"
                    placeholder="Ex: 350"
                    value={averageConsumption}
                    onChange={(e) => setAverageConsumption(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.averageConsumption && <p className="text-sm text-destructive">{errors.averageConsumption}</p>}
              </div>

              <Button
                variant="gradient"
                size="lg"
                className="w-full mt-6"
                onClick={handleNext}
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Solar System Details */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-6">
              <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                <Sun className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Sistema Solar
              </h1>
              <p className="text-muted-foreground mt-1">
                Informe os dados do seu sistema fotovoltaico
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfModules">Número de módulos</Label>
                  <Input
                    id="numberOfModules"
                    type="number"
                    placeholder="Ex: 12"
                    value={numberOfModules}
                    onChange={(e) => setNumberOfModules(e.target.value)}
                  />
                  {errors.numberOfModules && <p className="text-sm text-destructive">{errors.numberOfModules}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modulePowerWatts">Potência por módulo (W)</Label>
                  <Input
                    id="modulePowerWatts"
                    type="number"
                    placeholder="Ex: 550"
                    value={modulePowerWatts}
                    onChange={(e) => setModulePowerWatts(e.target.value)}
                  />
                  {errors.modulePowerWatts && <p className="text-sm text-destructive">{errors.modulePowerWatts}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moduleBrand">Marca dos módulos</Label>
                  <Input
                    id="moduleBrand"
                    placeholder="Ex: Canadian Solar"
                    value={moduleBrand}
                    onChange={(e) => setModuleBrand(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inverterBrand">Marca do inversor</Label>
                  <Input
                    id="inverterBrand"
                    placeholder="Ex: Growatt"
                    value={inverterBrand}
                    onChange={(e) => setInverterBrand(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inverterPowerWatts">Potência inversor (W)</Label>
                  <Input
                    id="inverterPowerWatts"
                    type="number"
                    placeholder="Ex: 6000"
                    value={inverterPowerWatts}
                    onChange={(e) => setInverterPowerWatts(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installationYear">Ano de instalação</Label>
                  <Input
                    id="installationYear"
                    type="number"
                    placeholder="Ex: 2023"
                    value={installationYear}
                    onChange={(e) => setInstallationYear(e.target.value)}
                  />
                  {errors.installationYear && <p className="text-sm text-destructive">{errors.installationYear}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systemCost">Custo do sistema (R$)</Label>
                  <Input
                    id="systemCost"
                    type="number"
                    placeholder="Ex: 25000"
                    value={systemCost}
                    onChange={(e) => setSystemCost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastMaintenanceDate">Última manutenção</Label>
                  <Input
                    id="lastMaintenanceDate"
                    type="date"
                    value={lastMaintenanceDate}
                    onChange={(e) => setLastMaintenanceDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Calculated Values Preview */}
              {numberOfModules && modulePowerWatts && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Valores Calculados
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Potência total</p>
                      <p className="text-lg font-bold gradient-text">
                        {totalPowerKw.toFixed(2)} kWp
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Geração estimada/mês</p>
                      <p className="text-lg font-bold gradient-text">
                        {expectedGeneration.toFixed(0)} kWh
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  variant="gradient"
                  size="lg"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Cadastrar
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
