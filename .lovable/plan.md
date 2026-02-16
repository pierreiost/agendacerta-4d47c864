
# Correção: Reservas Recorrentes com Fuso Horário Incorreto

## Problema Identificado

A função de banco de dados `create_recurring_bookings` constrói timestamps usando o fuso horário do servidor (UTC) em vez do fuso horário do usuario (BRT/UTC-3).

Quando o usuario seleciona "14:00" no wizard, a funcao grava `14:00 UTC`, que equivale a `11:00 BRT`. Como a grade da agenda comeca as 14:00 BRT (horario de funcionamento configurado), essas reservas ficam com posicao negativa e sao invisíveis.

As reservas avulsas (nao recorrentes) funcionam corretamente porque o JavaScript do navegador constroi o timestamp completo com o fuso local antes de enviar ao backend.

## Solucao

Modificar a funcao RPC `create_recurring_bookings` para aceitar um parametro de timezone e usar esse fuso ao construir os timestamps.

### Mudancas Necessarias

**1. Migracao SQL - Alterar a funcao `create_recurring_bookings`**

Adicionar parametro `p_timezone text DEFAULT 'America/Sao_Paulo'` e alterar a construcao dos timestamps de:

```text
v_start_time := (v_current_date || ' ' || p_start_hour || ':00:00')::timestamptz;
```

Para:

```text
v_start_time := ((v_current_date || ' ' || p_start_hour || ':00:00') AT TIME ZONE p_timezone);
```

Isso garante que "14:00" seja interpretado como 14:00 no fuso do usuario, resultando em `17:00 UTC` (correto).

**2. Frontend - `src/hooks/useBookingRPC.ts`**

Passar o timezone do navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`) como parametro adicional na chamada RPC:

```text
p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
```

**3. Corrigir reservas ja criadas com horario errado**

Executar uma query de correcao para ajustar as reservas recorrentes existentes do venue afetado, somando 3 horas aos timestamps (diferenca UTC para BRT).

### Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Recriar funcao `create_recurring_bookings` com parametro `p_timezone` |
| `src/hooks/useBookingRPC.ts` | Passar timezone do navegador na chamada RPC |
| Interface `CreateRecurringBookingsParams` | Adicionar campo `timezone` |

### Impacto

- Reservas recorrentes futuras serao criadas no horario correto
- Reservas ja criadas serao corrigidas via migracao de dados
- Nenhuma mudanca na interface visual do wizard
- Compatibilidade mantida (timezone tem valor padrao `America/Sao_Paulo`)
