import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HealthRecord } from '@/hooks/useHealthRecords';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ChevronDown, ChevronUp, Droplets, Trash2, Scale, Ruler, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthRecordTimelineProps {
  records: HealthRecord[];
  onDelete?: (id: string) => void;
}

function getBmiColor(bmi: number | null) {
  if (!bmi) return '';
  if (bmi < 18.5) return 'text-blue-600';
  if (bmi < 25) return 'text-green-600';
  if (bmi < 30) return 'text-yellow-600';
  return 'text-red-600';
}

export function HealthRecordTimeline({ records, onDelete }: HealthRecordTimelineProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Nenhum registro encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const isOpen = openId === record.id;
        return (
          <Collapsible key={record.id} open={isOpen} onOpenChange={(open) => setOpenId(open ? record.id : null)}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardContent className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {format(new Date(record.recorded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {record.weight_kg && (
                          <span className="flex items-center gap-1">
                            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                            {record.weight_kg}kg
                          </span>
                        )}
                        {record.bmi && (
                          <span className={cn('font-medium', getBmiColor(record.bmi))}>
                            IMC {record.bmi}
                          </span>
                        )}
                        {record.blood_pressure && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                            {record.blood_pressure}
                          </span>
                        )}
                        {record.blood_type && (
                          <span className="flex items-center gap-1">
                            <Droplets className="h-3.5 w-3.5 text-red-400" />
                            {record.blood_type}
                          </span>
                        )}
                      </div>
                      {record.chief_complaint && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{record.chief_complaint}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {record.allergies && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Alergias
                        </Badge>
                      )}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="px-3 pb-3 pt-0 border-t space-y-3">
                  {record.height_cm && (
                    <div className="flex items-center gap-1 text-sm">
                      <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                      Altura: {record.height_cm}cm
                    </div>
                  )}

                  {record.allergies && (
                    <div className="p-2 rounded border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mb-1">
                        <AlertTriangle className="h-3 w-3" /> Alergias
                      </p>
                      <p className="text-sm">{record.allergies}</p>
                    </div>
                  )}

                  {record.medications && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Medicamentos</p>
                      <p className="text-sm">{record.medications}</p>
                    </div>
                  )}

                  {record.chief_complaint && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Queixa Principal</p>
                      <p className="text-sm">{record.chief_complaint}</p>
                    </div>
                  )}

                  {record.clinical_notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Conduta / Evolução</p>
                      <p className="text-sm">{record.clinical_notes}</p>
                    </div>
                  )}

                  {onDelete && (
                    <div className="flex justify-end pt-1">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(record.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                      </Button>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
