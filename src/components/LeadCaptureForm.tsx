import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/integrations/supabase/clientUntyped";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  whatsapp: z.string().min(14, "WhatsApp inválido").max(15, "WhatsApp inválido"),
});

export type LeadFormData = z.infer<typeof formSchema>;

interface LeadCaptureFormProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (leadId: string, leadData: LeadFormData) => void;
  hasSolar: boolean;
  analysisSummary?: any;
}

export function LeadCaptureForm({ isOpen, onClose, onSuccess, hasSolar, analysisSummary }: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      whatsapp: "",
    },
  });

  // Simple WhatsApp mask (XX) XXXXX-XXXX
  const applyWhatsappMask = (value: string) => {
    const cleaned = ("" + value).replace(/\D/g, "");
    const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
    if (match) {
      return !match[2] 
        ? match[1] 
        : `(${match[1]}) ${match[2]}` + (match[3] ? `-${match[3]}` : "");
    }
    return value;
  };

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      // Remover máscara do whatsapp para salvar no banco
      const cleanWhatsapp = data.whatsapp.replace(/\D/g, "");
      
      const generatedId = crypto.randomUUID();
      
      const { error } = await db("leads")
        .insert({
          id: generatedId,
          name: data.name,
          email: data.email,
          whatsapp: cleanWhatsapp,
          has_solar: hasSolar,
          analysis_summary: analysisSummary || null,
          source: "lead_magnet_gate"
        });

      if (error) throw error;

      const { error: crmError } = await supabase.functions.invoke("trigger-crm", {
        body: { leadId: generatedId, action: "lead" },
      });

      if (crmError) {
        console.error("Error triggering CRM workflow:", crmError);
        throw crmError;
      }

      toast({
        title: "Tudo pronto!",
        description: "Análise liberada com sucesso.",
      });

      onSuccess(generatedId, data);
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: "Erro",
        description: "Houve um problema. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl text-center">Sua análise está pronta!</DialogTitle>
          <DialogDescription className="text-center text-base">
            Descobrimos como você pode {hasSolar ? 'melhorar seu sistema' : 'parar de alugar energia'}. 
            Para ver o resultado completo, preencha os dados abaixo:
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Qual seu nome?" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(11) 99999-9999" 
                      disabled={isSubmitting}
                      {...field} 
                      onChange={(e) => {
                        const masked = applyWhatsappMask(e.target.value);
                        field.onChange(masked);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" type="email" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Liberando Análise...
                </>
              ) : (
                "Ver Meu Relatório Gratuito"
              )}
            </Button>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-medium">
                <ShieldCheck className="h-4 w-4" /> Dados 100% seguros
              </div>
              <p className="text-center opacity-80">
                Junte-se a centenas de proprietários que já descobriram como pagar menos na conta de luz.
              </p>
            </motion.div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
