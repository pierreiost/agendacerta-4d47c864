import { useState } from "react";
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/hooks/usePermissions";

const formSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["manager", "staff"]),
});

type FormData = z.infer<typeof formSchema>;

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "manager", label: "Gerente" },
  { value: "staff", label: "Funcionário" },
];

export function CreateMemberDialog({ open, onOpenChange }: CreateMemberDialogProps) {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: "staff",
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = form;
  const selectedRole = watch("role");

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setShowPassword(false);
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: FormData) => {
    if (!currentVenue?.id) return;

    setIsSubmitting(true);

    try {
      const { data: response, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          venueId: currentVenue.id,
          role: data.role,
        },
      });

      if (error) throw error;

      if (!response.success) {
        throw new Error(response.error || "Erro ao criar membro");
      }

      toast({ title: "Membro criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["team-members", currentVenue.id] });
      handleOpenChange(false);
    } catch (error) {
      console.error("Create member error:", error);
      toast({
        title: "Erro ao criar membro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Membro
          </DialogTitle>
          <DialogDescription>
            Crie uma nova conta para o membro da equipe
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              placeholder="Nome do colaborador"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                {...register("password")}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Função</Label>
            <Select 
              value={selectedRole} 
              onValueChange={(v) => setValue("role", v as "manager" | "staff")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Criar Membro
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
