import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthRecordFormProps {
  defaultAllergies?: string | null;
  defaultBloodType?: string | null;
  onSubmit: (data: {
    weight_kg: number | null;
    height_cm: number | null;
    blood_pressure: string | null;
    allergies: string | null;
    medications: string | null;
    chief_complaint: string | null;
    clinical_notes: string | null;
    blood_type: string | null;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function getBmiClassification(bmi: number) {
  if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-600' };
  if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
  if (bmi < 30) return { label: 'Sobrepeso', color: 'text-yellow-600' };
  return { label: 'Obesidade', color: 'text-red-600' };
}

export function HealthRecordForm({ defaultAllergies, defaultBloodType, onSubmit, onCancel, isSubmitting }: HealthRecordFormProps) {
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [allergies, setAllergies] = useState(defaultAllergies || '');
  const [medications, setMedications] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [bloodType, setBloodType] = useState(defaultBloodType || '');

  const bmi = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    if (w > 0 && h > 0) return Math.round((w / ((h / 100) * (h / 100))) * 10) / 10;
    return null;
  }, [weightKg, heightCm]);

  const bmiClass = bmi ? getBmiClassification(bmi) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      blood_pressure: bloodPressure || null,
      allergies: allergies || null,
      medications: medications || null,
      chief_complaint: chiefComplaint || null,
      clinical_notes: clinicalNotes || null,
      blood_type: bloodType || null,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Novo Registro</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Weight + Height + BMI */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" step="0.1" min="0" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="70.5" />
            </div>
            <div>
              <Label>Altura (cm)</Label>
              <Input type="number" step="1" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="170" />
            </div>
            <div>
              <Label>IMC</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                {bmi ? (
                  <span className={cn('font-semibold', bmiClass?.color)}>
                    {bmi} <span className="text-xs font-normal">({bmiClass?.label})</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Blood Pressure + Blood Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pressão Arterial</Label>
              <Input value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="120/80" />
            </div>
            <div>
              <Label>Tipo Sanguíneo</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allergies */}
          <div>
            <Label className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Alergias
            </Label>
            <Textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Registre alergias conhecidas..."
              className="border-red-200 bg-red-50/50 focus:border-red-300 dark:border-red-900 dark:bg-red-950/20"
              rows={2}
            />
          </div>

          {/* Medications */}
          <div>
            <Label>Medicamentos em uso</Label>
            <Textarea value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Liste os medicamentos..." rows={2} />
          </div>

          {/* Chief Complaint */}
          <div>
            <Label>Queixa Principal</Label>
            <Textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Descreva a queixa..." rows={2} />
          </div>

          {/* Clinical Notes */}
          <div>
            <Label>Conduta / Evolução</Label>
            <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Registre a conduta..." rows={3} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
