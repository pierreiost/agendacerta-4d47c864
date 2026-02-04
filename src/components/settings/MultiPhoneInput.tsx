import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maskPhone } from '@/lib/masks';
import { Plus, X } from 'lucide-react';

interface MultiPhoneInputProps {
  value: string[];
  onChange: (phones: string[]) => void;
  max?: number;
  disabled?: boolean;
}

export function MultiPhoneInput({
  value,
  onChange,
  max = 5,
  disabled = false,
}: MultiPhoneInputProps) {
  // Ensure we always have at least one empty field
  const phones = value.length === 0 ? [''] : value;

  const handleChange = (index: number, newValue: string) => {
    const masked = maskPhone(newValue);
    const updated = [...phones];
    updated[index] = masked;
    onChange(updated);
  };

  const handleAdd = () => {
    if (phones.length < max) {
      onChange([...phones, '']);
    }
  };

  const handleRemove = (index: number) => {
    if (phones.length > 1) {
      const updated = phones.filter((_, i) => i !== index);
      onChange(updated);
    }
  };

  return (
    <div className="space-y-2">
      {phones.map((phone, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={phone}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder="(11) 99999-9999"
            maxLength={15}
            disabled={disabled}
            className="flex-1"
          />
          {phones.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
              title="Remover telefone"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      
      {phones.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar telefone
        </Button>
      )}
      
      <p className="text-xs text-muted-foreground">
        {phones.filter(p => p.trim()).length} de {max} telefones
      </p>
    </div>
  );
}
