
# Plano: Prontuario Evolutivo Rapido (Mini Ficha Medica / Anamnese)

Modulo exclusivo para o segmento **health**, adicionando uma aba de prontuario no historico do paciente com registro de dados vitais, alergias, medicamentos e evolucao clinica.

---

## 1. Banco de Dados

### Tabela `health_records`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | ID do registro |
| venue_id | uuid NOT NULL | Vinculo com a clinica |
| customer_id | uuid NOT NULL | Vinculo com o paciente |
| recorded_at | timestamptz | Data/hora do registro (default now()) |
| weight_kg | numeric | Peso em kg |
| height_cm | numeric | Altura em cm |
| bmi | numeric GENERATED | IMC calculado automaticamente: `weight_kg / ((height_cm/100)^2)` |
| blood_pressure | text | Pressao arterial (ex: "120/80") |
| allergies | text | Alergias (campo de destaque) |
| medications | text | Medicamentos em uso |
| chief_complaint | text | Queixa principal |
| clinical_notes | text | Conduta / evolucao |
| created_by | uuid | Profissional que registrou |
| created_at | timestamptz | Timestamp de criacao |

**RLS**: Mesmas regras de `customers` - acesso restrito a membros da venue (`is_venue_member`).

**Indice**: `(customer_id, recorded_at DESC)` para consultas rapidas do historico.

**Coluna gerada (IMC)**: Calculada automaticamente pelo banco usando `GENERATED ALWAYS AS`. O frontend nao precisa calcular.

---

## 2. Arquivos a Criar

### 2.1 `src/hooks/useHealthRecords.ts`
Hook com CRUD completo usando React Query:
- `useHealthRecords(customerId)` - lista registros ordenados por data
- `createRecord` / `updateRecord` / `deleteRecord` - mutations
- Query key: `['health-records', customerId]`

### 2.2 `src/components/customers/HealthRecordForm.tsx`
Formulario para novo registro com campos:
- Peso (kg) + Altura (cm) - lado a lado, IMC exibido em tempo real
- Pressao arterial
- Alergias (com borda/fundo vermelho claro para destaque)
- Medicamentos em uso
- Queixa principal (textarea)
- Conduta (textarea)

### 2.3 `src/components/customers/HealthRecordTimeline.tsx`
Timeline visual com:
- Cards empilhados por data (mais recente primeiro)
- Cada card mostra: data, peso, IMC, PA, queixa resumida
- Expand/collapse para ver detalhes completos
- Badge vermelho para alergias quando presentes

### 2.4 `src/components/customers/HealthEvolutionChart.tsx`
Graficos de evolucao usando **recharts** (ja instalado):
- Grafico de linha para peso ao longo do tempo
- Grafico de linha para IMC ao longo do tempo
- Toggle entre peso e IMC
- Periodo selecionavel (ultimos 3, 6, 12 meses)

---

## 3. Arquivos a Modificar

### 3.1 `src/components/customers/CustomerHistorySheet.tsx`
Transformar o sheet em um layout com **Tabs** (ja tem o componente):
- **Aba "Historico"**: conteudo atual (reservas, stats)
- **Aba "Prontuario"** (apenas para segmento health): timeline + graficos + botao "Novo Registro"

A aba Prontuario so aparece quando `venueSegment === 'health'`.

### 3.2 `src/pages/Clientes.tsx`
Passar o `venueSegment` para o `CustomerHistorySheet` (via VenueContext, que ja esta disponivel).

---

## 4. UX e Visual

### Ficha de Alergias
- Campo com `border-red-300 bg-red-50` para destaque visual
- Icone de alerta (AlertTriangle) ao lado do label
- Se o paciente tem alergias, exibir badge vermelho na timeline

### IMC Automatico
- Exibido em tempo real no formulario conforme peso/altura sao digitados
- Classificacao com cor:
  - Abaixo do peso (< 18.5): azul
  - Normal (18.5-24.9): verde
  - Sobrepeso (25-29.9): amarelo
  - Obesidade (>= 30): vermelho

### Graficos de Evolucao
- Usar `LineChart` do recharts com area preenchida
- Tooltip mostrando data + valor
- Responsivo com `ResponsiveContainer`

---

## 5. Sugestoes Extras

1. **Campo "Tipo Sanguineo"**: Adicionar um campo select com opcoes (A+, A-, B+, B-, AB+, AB-, O+, O-). E um dado que se registra uma vez e fica visivel sempre.

2. **Alerta de Alergias na Agenda**: Quando o profissional abre um agendamento de um paciente com alergias cadastradas, exibir um banner vermelho sutil. Isso pode ser uma fase 2.

3. **Exportar Prontuario em PDF**: Usando `jspdf` (ja instalado) para gerar um resumo do prontuario do paciente. Tambem pode ser fase 2.

---

## Resumo de Impacto

| Item | Detalhes |
|------|----------|
| Nova tabela | `health_records` com RLS |
| Novos arquivos | 4 componentes + 1 hook |
| Arquivos modificados | 2 (CustomerHistorySheet, Clientes) |
| Dependencias | Nenhuma nova (recharts e jspdf ja existem) |
| Segmentos afetados | Apenas `health` |
