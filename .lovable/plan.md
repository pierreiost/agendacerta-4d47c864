

# Modulo "Minhas Reservas" - Consulta Publica por Telefone

## Resumo
Criar uma pagina publica `/minhas-reservas` onde clientes podem consultar seus agendamentos informando o telefone. O cancelamento e feito via WhatsApp do estabelecimento, nunca diretamente pelo site.

## 1. Backend - RPC `get_client_bookings_by_phone`

Criar uma funcao PostgreSQL (via migration) que:
- Recebe `p_phone` (text)
- Normaliza o input removendo caracteres nao-numericos
- Busca na tabela `bookings` comparando `customer_phone` normalizado
- Faz JOIN com `venues` para obter o `whatsapp` do estabelecimento
- Faz LEFT JOIN com `booking_services` e `services` para nome do servico
- Faz LEFT JOIN com `venue_members` para nome do profissional
- Filtra: reservas futuras OU dos ultimos 30 dias
- Retorna: booking_id, customer_name, start_time, end_time, status, grand_total, service_title, professional_name, venue_name, venue_whatsapp
- Marcada como `SECURITY DEFINER` com `search_path = 'public'`
- Sem exigencia de autenticacao (funcao publica para clientes)

## 2. Frontend

### Rota
- Adicionar `/minhas-reservas` em `App.tsx` como rota publica (junto com `/inicio`, `/marketplace`, etc.)

### Pagina `src/pages/MinhasReservas.tsx`
- **Tela inicial**: Input com mascara de telefone `(XX) XXXXX-XXXX` (usando `maskPhone` de `src/lib/masks.ts`) + botao "Buscar Agendamentos"
- **Estado de carregamento**: Spinner enquanto busca
- **Resultado vazio**: Mensagem amigavel "Nenhum agendamento encontrado para este numero."
- **Listagem em cards**:
  - Data/Hora em destaque
  - Nome do servico e profissional (quando disponivel)
  - Badge de status (Confirmado = verde, Pendente = amarelo)
  - Valor total
  - Botao "Solicitar Cancelamento" com icone WhatsApp (verde)
    - Se venue tem whatsapp: abre `wa.me/{phone}?text=Ola! Sou {nome}, fiz um agendamento para dia {data} as {hora} e gostaria de solicitar o cancelamento.`
    - Se nao tem: exibe texto "Para cancelar, ligue para o estabelecimento."

### Hook `src/hooks/useClientBookings.ts`
- Hook simples com `useQuery` (desabilitado por padrao, ativado ao clicar "Buscar")
- Chama `supabase.rpc('get_client_bookings_by_phone', { p_phone })`

## 3. Detalhes Tecnicos

### Migration SQL
```sql
CREATE OR REPLACE FUNCTION public.get_client_bookings_by_phone(p_phone text)
RETURNS TABLE(
  booking_id uuid,
  customer_name text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  grand_total numeric,
  service_title text,
  professional_name text,
  venue_name text,
  venue_whatsapp text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clean_phone text;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_clean_phone) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.customer_name,
    b.start_time,
    b.end_time,
    b.status::text,
    b.grand_total,
    s.title,
    COALESCE(vm.display_name, pr.full_name),
    v.name,
    v.whatsapp
  FROM bookings b
  JOIN venues v ON v.id = b.venue_id
  LEFT JOIN booking_services bs ON bs.booking_id = b.id
  LEFT JOIN services s ON s.id = bs.service_id
  LEFT JOIN venue_members vm ON vm.id = b.professional_id
  LEFT JOIN profiles pr ON pr.user_id = vm.user_id
  WHERE regexp_replace(b.customer_phone, '[^0-9]', '', 'g') LIKE '%' || v_clean_phone
    AND b.start_time >= (now() - interval '30 days')
    AND b.status != 'CANCELLED'
  ORDER BY b.start_time DESC;
END;
$$;
```

### Arquivos a criar
- `src/pages/MinhasReservas.tsx` - Pagina principal
- `src/hooks/useClientBookings.ts` - Hook de busca

### Arquivos a modificar
- `src/App.tsx` - Adicionar rota publica `/minhas-reservas`

### Componentes reutilizados
- `Card`, `CardContent`, `CardHeader` de shadcn
- `Badge` para status
- `Button` para acoes
- `Input` com mascara via `maskPhone`
- `MessageCircle` (lucide) como icone do WhatsApp
- `Loader2` para loading

