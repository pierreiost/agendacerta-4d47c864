

# Plano: Alerta de Pendências + Notificações Push/Vibração em Tempo Real

## 1. Alerta de Pendências ao Abrir o Dashboard (Exibição Única)

**Componente**: `src/components/notifications/PendingNotificationsAlert.tsx`

- Dialog/banner que aparece no Dashboard quando `unreadCount > 0`
- Controle via `sessionStorage` (chave `pending_alert_shown`) — garante exibição **uma única vez por sessão** do navegador
- Botão "Ver" → abre o popover do sino (ou navega para agenda)
- Botão "Fechar" → dismiss, marca no sessionStorage
- Usado apenas dentro de `Dashboard.tsx`

## 2. Sistema de Notificações Nativas (Push + Vibração + Toast)

### 2A. Solicitar Permissão de Notificações

**Componente**: `src/components/notifications/NotificationPermissionPrompt.tsx`

- Banner amigável exibido no AppLayout (uma vez por sessão) caso `Notification.permission === 'default'`
- Texto: "Ative as notificações para não perder nenhum agendamento"
- Botões: "Ativar" (chama `Notification.requestPermission()`) e "Agora não" (dismiss)
- Controle via `localStorage` (`notification_permission_asked`) para não mostrar novamente se o usuário recusou

### 2B. Disparo Multicanal no Evento Realtime

**Modificação**: `src/hooks/useNotifications.ts`

No callback do realtime `INSERT`, além do `invalidateQueries`, disparar:

1. **Toast interno** (Sonner) — já temos a infra
2. **Vibração** — `navigator.vibrate?.(200)` (API padrão, funciona em Android/Chrome)
3. **Notificação nativa do SO** — `new Notification('Nova Reserva no AgendaCerta', { body: '...', icon: '/favicon.ico' })` se permissão concedida

Para obter os dados da notificação no callback realtime, usaremos o payload `new` do postgres_changes (que já retorna a row inserida).

## Arquivos

| Arquivo | Alteração |
|---|---|
| `src/components/notifications/PendingNotificationsAlert.tsx` | **Novo** — Dialog de pendências |
| `src/components/notifications/NotificationPermissionPrompt.tsx` | **Novo** — Banner de permissão |
| `src/hooks/useNotifications.ts` | Adicionar toast + vibração + push nativa no callback realtime |
| `src/pages/Dashboard.tsx` | Importar e renderizar `PendingNotificationsAlert` |
| `src/components/layout/AppLayout.tsx` | Importar e renderizar `NotificationPermissionPrompt` |

## Detalhes Técnicos

- `sessionStorage` para alerta de pendências (limpa ao fechar aba → mostra de novo na próxima sessão)
- `localStorage` para permissão de notificações (pergunta só uma vez)
- Vibração é best-effort (Safari iOS não suporta, falha silenciosamente)
- Push nativa usa a API `Notification` do browser (funciona em desktop e Android, limitada no iOS Safari)
- Nenhuma alteração no banco de dados necessária

