import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { Mail, Lock, User, Loader2, Sun, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoloLogo } from "@/components/SoloLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Erro ao entrar",
              description: "Email ou senha incorretos",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao entrar",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      } else {
        const result = signupSchema.safeParse({ email, password, confirmPassword, fullName });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Erro ao cadastrar",
              description: "Este email já está cadastrado",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao cadastrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Verifique seu email para confirmar o cadastro",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <SoloLogo className="h-10 w-auto" />
              <ThemeToggle />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isLogin
                ? "Entre para acessar seu painel solar"
                : "Comece a monitorar sua energia solar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isLogin ? "Entrando..." : "Criando conta..."}
                </>
              ) : (
                <>
                  {isLogin ? "Entrar" : "Criar conta"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Não tem conta? Cadastre-se"
                : "Já tem conta? Entre"}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Right side — Solo brand panel (always dark, brand signature) */}
      <div
        className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden"
        style={{ background: "#141414" }}  /* Always dark — brand panel */
      >
        {/* Decorative grid */}
        <div className="absolute inset-0 solo-grid-bg opacity-30 pointer-events-none" />

        {/* Gradient bar top */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-60"
          style={{ background: "linear-gradient(90deg, transparent, #FF481E, #FFC200, transparent)" }}
        />

        {/* Big decorative symbol — faint */}
        <div
          className="absolute right-[-40px] bottom-[-40px] w-80 h-80 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url('/src/assets/solo-symbol.png')`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative max-w-md"
        >
          {/* Kicker */}
          <div
            className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 border"
            style={{
              borderRadius: "var(--radius)",
              borderColor: "rgb(255 72 30 / 0.3)",
              background: "rgb(255 72 30 / 0.08)",
            }}
          >
            <Sun className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Solo Bill Analyzer</span>
          </div>

          <h2 className="text-4xl font-bold text-[#E3E2DD] mb-4 leading-tight tracking-tight">
            Você no controle<br />
            <span className="gradient-text">da sua energia</span>
          </h2>

          <p className="text-base text-[#8A8880] mb-8 leading-relaxed">
            Monitore sua geração solar, analise contas automaticamente com IA
            e acompanhe sua economia mês a mês.
          </p>

          {/* Feature rows — engineering precision style */}
          <div
            className="space-y-0 border border-border overflow-hidden"
            style={{ borderRadius: "var(--radius)" }}
          >
            {[
              { icon: "📊", text: "Análise automática de contas com IA" },
              { icon: "⚡", text: "Monitoramento de geração em tempo real" },
              { icon: "💰", text: "Cálculo de economia e retorno do investimento" },
            ].map((item, i, arr) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                style={{ background: "rgb(255 255 255 / 0.02)" }}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="text-sm text-[#A0A09A]">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Bottom tagline */}
          <p className="mt-8 text-xs text-[#555550] tracking-wide uppercase">
            Solo Energia · Precisão em engenharia solar
          </p>
        </motion.div>
      </div>
    </div>
  );
}
