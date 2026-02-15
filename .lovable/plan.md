

# Widget de Orcamento para Assistencia Tecnica

## Resumo

Hoje, se uma loja do segmento "custom" (Assistencia Tecnica) tiver sua pagina publica acessada, o sistema mostra incorretamente um calendario de agendamento. Este plano cria um widget dedicado de captacao de orcamentos e o integra automaticamente baseado no segmento da venue.

---

## O que sera feito

### 1. Novo componente: InquiryWidget

Criar `src/components/public-page/InquiryWidget.tsx` -- um formulario limpo e dedicado para orcamentos tecnicos, **sem calendario ou selecao de horarios**.

**Campos do formulario:**
- Modelo do equipamento (texto, obrigatorio) -- ex: "iPhone 13", "MacBook Pro 2021"
- Descricao do defeito (textarea, obrigatorio)
- Fotos do dano (upload opcional, max 5 fotos) -- reutiliza o bucket `inquiry-photos` existente
- Nome completo (obrigatorio)
- WhatsApp (obrigatorio, com validacao minima de 8 digitos)
- Email (opcional)

**Tela de sucesso:**
- Icone de relogio (warning) + "Solicitacao Recebida!"
- Mensagem: "Nossa equipe tecnica analisara seu relato e entrara em contato."
- Botao WhatsApp pre-preenchido: "Ola! Acabei de enviar uma solicitacao de orcamento para [modelo]. Aguardo retorno!"
- Botao "Nova solicitacao"

**Icone do header:** Wrench (em vez de Calendar/Scissors)

### 2. Alteracao no banco de dados

**2a. Adicionar coluna `device_model` na tabela `service_inquiries`:**
```
ALTER TABLE service_inquiries ADD COLUMN device_model TEXT;
```

**2b. Atualizar RPC `create_service_inquiry`:**
- Adicionar parametro `p_device_model TEXT DEFAULT NULL`
- Remover a restricao `booking_mode != 'inquiry'` e substituir por uma validacao que aceite tanto `booking_mode = 'inquiry'` quanto venues do segmento `custom`
- Inserir `device_model` no INSERT

**2c. Criar trigger de notificacao para `service_inquiries`:**
```sql
CREATE FUNCTION notify_new_inquiry() ...
  INSERT INTO venue_notifications (venue_id, type, title, message, reference_id)
  VALUES (NEW.venue_id, 'NEW_INQUIRY', 'Nova Solicitacao de Orcamento',
          'Cliente ' || NEW.customer_name || ' solicitou orcamento para ' || COALESCE(NEW.device_model, 'equipamento'),
          NEW.id);
```
Trigger: `AFTER INSERT ON service_inquiries FOR EACH ROW`

### 3. Roteamento na pagina publica

**`PublicPageVenue.tsx`** -- atualizar a logica de renderizacao:

```
if (beauty || health) -> ServiceBookingWidget
else if (custom) -> InquiryWidget       <-- NOVO
else -> BookingWidget (sports/calendar)
```

**`MobileBookingButton.tsx`** -- mesma logica:
- Importar `InquiryWidget`
- Adicionar condicional `venue.segment === 'custom'`
- Label do botao mobile: "Solicitar Orcamento"
- Icone: `Wrench` em vez de `Calendar`

### 4. Exportar componente

Atualizar `src/components/public-page/index.ts` para exportar o `InquiryWidget`.

---

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/components/public-page/InquiryWidget.tsx` | Criar (novo componente) |
| `src/pages/public/PublicPageVenue.tsx` | Editar (roteamento por segmento) |
| `src/components/public-page/MobileBookingButton.tsx` | Editar (roteamento + icone) |
| `src/components/public-page/index.ts` | Editar (exportar InquiryWidget) |
| Migration SQL | Criar (coluna device_model + trigger notificacao + atualizar RPC) |

---

## Detalhes tecnicos

### Fluxo de dados do InquiryWidget

```text
[Cliente preenche form]
       |
       v
[Upload fotos -> bucket inquiry-photos]
       |
       v
[supabase.rpc('create_service_inquiry', { ... p_device_model })]
       |
       v
[Trigger: INSERT venue_notifications (type=NEW_INQUIRY)]
       |
       v
[Sino do admin: "Nova Solicitacao de Orcamento - iPhone 13"]
```

### Validacao do RPC atualizada

A RPC passara a aceitar venues onde:
- `booking_mode = 'inquiry'` (comportamento atual preservado), **OU**
- `segment = 'custom'` (novo -- permite assistencias tecnicas)

Isso garante retrocompatibilidade com venues existentes que ja usam o modo inquiry.

### Componentes reutilizados
- Upload de fotos: logica inline (mesmo padrao do BookingWidget existente) com validacao de MIME type e tamanho
- Bucket `inquiry-photos`: ja existe e tem RLS configurado
- Toasts e estados de loading: padrao Sonner/useToast do projeto
- WhatsApp link: mesma logica `wa.me` usada nos outros widgets

