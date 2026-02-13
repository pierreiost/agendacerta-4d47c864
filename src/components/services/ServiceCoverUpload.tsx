import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

interface ServiceCoverUploadProps {
  venueId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

export function ServiceCoverUpload({ venueId, value, onChange }: ServiceCoverUploadProps) {
  const { upload, isUploading } = useFileUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file, {
      bucket: 'public-page-assets',
      folder: `services/${venueId}`,
      maxSizeMB: 5,
    });

    if (result) {
      onChange(result.url);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Imagem de capa (opcional)</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img src={value} alt="Capa do serviço" className="w-full aspect-[4/3] object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full aspect-[4/3] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Adicionar imagem</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
