

# Solucao Definitiva: Eliminar Loops de Re-renderizacao no ServiceBookingWizard

## Problema Raiz

O `watch()` do `react-hook-form` cria uma subscricao que causa re-render a CADA mudanca de valor no formulario. Quando `serviceIds` (array) e observado via `watch()`, cada `setValue` gera uma nova referencia de array, que por sua vez re-dispara todos os `useMemo` e o `useProfessionalAvailability` -- criando uma cascata de re-renders que em certos cenarios (cache quente, muitos profissionais, rede lenta) ultrapassa o limite do React.

## Estrategia: Substituir `watch()` por estado local controlado

Em vez de depender do `watch()` do react-hook-form para os campos criticos (`serviceIds`, `professionalId`, `startTime`), vamos gerenciar esses valores como `useState` local e sincronizar com o form apenas no momento do submit. Isso elimina completamente a cadeia reativa `watch -> setValue -> re-render -> watch`.

## Mudancas Tecnicas

### Arquivo: `src/components/agenda/ServiceBookingWizard.tsx`

1. **Remover `watch()` para campos problematicos**: Substituir `watch('serviceIds')`, `watch('professionalId')` e `watch('startTime')` por `useState` local.

2. **Manter `watch('customerName')` e `watch('date')`**: Esses campos escalares nao causam problemas de referencia.

3. **Sincronizar estado local com o form apenas no submit**: No `onSubmit`, copiar os valores locais para o form antes de validar.

4. **Simplificar handlers**: `handleServiceToggle` e `handleProfessionalSelect` agora alteram apenas o estado local (sem `form.setValue` durante interacao).

5. **Resetar estado local quando o dialog abre**: No `useEffect` de reset, tambem resetar os `useState`.

### Mudancas especificas:

```text
ANTES (linhas 124-128):
  const customerName = watch('customerName');
  const serviceIds = watch('serviceIds');
  const selectedDate = watch('date');
  const professionalId = watch('professionalId');
  const startTime = watch('startTime');

DEPOIS:
  const customerName = watch('customerName');
  const selectedDate = watch('date');
  // Campos gerenciados localmente para evitar loops de re-render
  const [localServiceIds, setLocalServiceIds] = useState<string[]>([]);
  const [localProfessionalId, setLocalProfessionalId] = useState('');
  const [localStartTime, setLocalStartTime] = useState('');
```

```text
ANTES (handleServiceToggle):
  form.setValue('serviceIds', updated, ...);
  form.setValue('professionalId', '', ...);
  form.setValue('startTime', '', ...);

DEPOIS:
  setLocalServiceIds(updated);
  setLocalProfessionalId('');
  setLocalStartTime('');
```

```text
ANTES (handleProfessionalSelect):
  form.setValue('professionalId', profId, ...);
  form.setValue('startTime', '', ...);

DEPOIS:
  setLocalProfessionalId(profId);
  setLocalStartTime('');
```

```text
ANTES (onSubmit):
  Usa data direto do form

DEPOIS:
  Antes de submeter, sincroniza:
  form.setValue('serviceIds', localServiceIds);
  form.setValue('professionalId', localProfessionalId);
  form.setValue('startTime', localStartTime);
  Entao submete via handleSubmit
```

```text
ANTES (reset useEffect):
  reset({ ..., serviceIds: [], professionalId: '', startTime: '' });

DEPOIS:
  reset({ ..., serviceIds: [], professionalId: '', startTime: '' });
  setLocalServiceIds([]);
  setLocalProfessionalId('');
  setLocalStartTime('');
```

6. **Todos os `useMemo` e o hook de disponibilidade passam a usar os estados locais** em vez dos valores do `watch()`.

7. **Na UI (Checkbox/Card)**: `isSelected` usa `localServiceIds.includes(service.id)` em vez de `serviceIds.includes(service.id)`.

8. **No submit**: A funcao `onSubmit` usara os valores locais diretamente (sem depender do form para esses campos).

## Por que isso e definitivo

- Elimina 100% das subscricoes reativas do `watch()` para arrays
- Estado local com `useState` e a forma mais previsivel e segura de gerenciar valores no React
- Nao ha mais cadeia `watch -> setValue -> re-render -> watch`
- O `useProfessionalAvailability` recebe referencia estavel do `useState` (nao recria array a cada render)
- Compatible com todos os segmentos (beauty, health, custom) pois todos usam o mesmo `ServiceBookingWizard`

