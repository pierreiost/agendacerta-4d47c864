import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export function AccessDenied({
  title = "Acesso Negado",
  description = "Você não tem permissão para acessar este recurso.",
  showHomeButton = true,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="p-4 rounded-full bg-destructive/10 mb-4">
        <ShieldOff className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {showHomeButton && (
        <Button onClick={() => navigate("/")} variant="outline">
          Voltar para o início
        </Button>
      )}
    </div>
  );
}
