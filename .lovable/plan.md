

# Plano: Redefinição de Senha com Verificação por Codigo

## Visao Geral

Implementar dois fluxos de redefinicao de senha:
1. **Botao interno nas Configuracoes** - Para usuarios logados alterarem sua propria senha
2. **Fluxo na tela de login** - Para usuarios que esqueceram a senha, usando verificacao por codigo OTP via email

---

## Arquitetura da Solucao

### Fluxo 1: Alteracao de Senha (Usuario Logado)

Botao dentro da aba "Unidade" ou nova aba "Perfil" nas Configuracoes que permite ao usuario alterar sua senha atual.

```text
Usuario logado -> Configuracoes -> "Alterar Senha"
-> Insere senha atual + nova senha + confirmacao
-> Valida senha atual via Supabase
-> Atualiza senha via supabase.auth.updateUser()
```

### Fluxo 2: Recuperacao de Senha (Tela de Login)

Fluxo completo com verificacao por codigo OTP enviado por email:

```text
Tela Login -> "Esqueci minha senha"
-> Insere email
-> Sistema envia codigo OTP de 6 digitos via email
-> Usuario digita codigo OTP
-> Sistema valida codigo
-> Usuario define nova senha
-> Redireciona para login
```

---

## Componentes a Criar/Modificar

### Arquivos Novos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/settings/ChangePasswordDialog.tsx` | Dialog para alterar senha (usuario logado) |
| `src/components/auth/ForgotPasswordFlow.tsx` | Componente com fluxo completo de recuperacao |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Configuracoes.tsx` | Adicionar botao/secao "Alterar Senha" |
| `src/pages/Auth.tsx` | Substituir fluxo simples de "forgot" pelo novo com OTP |

---

## Detalhamento Tecnico

### 1. Dialog de Alteracao de Senha (Usuario Logado)

**Campos:**
- Senha atual (para verificacao)
- Nova senha (com validacao de forca)
- Confirmar nova senha

**Fluxo:**
1. Valida que senhas novas coincidem
2. Valida requisitos de forca da senha
3. Reautentica o usuario com senha atual: `supabase.auth.signInWithPassword()`
4. Atualiza senha: `supabase.auth.updateUser({ password: novaSenha })`

**Codigo exemplo:**
```typescript
// Reautentica para confirmar senha atual
const { error: authError } = await supabase.auth.signInWithPassword({
  email: user.email!,
  password: currentPassword,
});

if (authError) {
  toast({ title: "Senha atual incorreta", variant: "destructive" });
  return;
}

// Atualiza para nova senha
const { error } = await supabase.auth.updateUser({ password: newPassword });
```

### 2. Fluxo de Recuperacao com OTP na Tela de Login

**Etapas do Wizard:**
1. **Etapa 1 - Email**: Usuario digita email
2. **Etapa 2 - Codigo**: Usuario recebe e digita codigo OTP de 6 digitos
3. **Etapa 3 - Nova Senha**: Usuario define nova senha

**Implementacao com Supabase:**

```typescript
// Etapa 1: Enviar OTP para email
await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false, // Nao cria usuario se nao existir
  }
});

// Etapa 2: Verificar OTP e autenticar
const { error } = await supabase.auth.verifyOtp({
  email,
  token: otpCode, // Codigo de 6 digitos
  type: 'email',
});

// Etapa 3: Atualizar senha (usuario ja autenticado apos verifyOtp)
await supabase.auth.updateUser({ password: newPassword });
```

### 3. Componente OTP Input

Reutilizaremos o componente existente `InputOTP` de `src/components/ui/input-otp.tsx`:

```typescript
<InputOTP maxLength={6} value={otp} onChange={setOtp}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

---

## Interface do Usuario

### Configuracoes - Alterar Senha

Nova secao ou card na aba "Unidade" com:
- Icone de cadeado
- Titulo: "Seguranca da Conta"
- Botao: "Alterar Senha"
- Ao clicar, abre dialog com formulario

### Tela de Login - Recuperacao

Ao clicar em "Esqueci minha senha":
1. **Tela Email**: Campo de email + botao "Enviar Codigo"
2. **Tela Codigo**: Input OTP de 6 digitos + timer de reenvio + botao "Reenviar codigo"
3. **Tela Nova Senha**: Campos de senha com validacao visual + botao "Redefinir"
4. **Tela Sucesso**: Icone de check + mensagem + redirecionamento automatico

---

## Validacoes de Seguranca

### Senha
- Minimo 8 caracteres
- Ao menos 1 letra maiuscula
- Ao menos 1 numero
- Ao menos 1 caractere especial
- Validacao visual em tempo real

### OTP
- Codigo de 6 digitos
- Expira em 10 minutos (padrao Supabase)
- Reenvio disponivel apos 60 segundos
- Limite de tentativas

---

## Acessibilidade e UX

- Botoes de mostrar/ocultar senha
- Indicadores visuais de progresso (steps)
- Feedback claro de erros
- Timer de reenvio de codigo
- Suporte a paste no campo OTP
- Auto-focus entre campos OTP

---

## Entregas

1. Criar `ChangePasswordDialog.tsx` para alteracao de senha interna
2. Adicionar secao "Seguranca" em Configuracoes com botao
3. Refatorar `Auth.tsx` para usar novo fluxo OTP no modo "forgot"
4. Criar estados e steps para o wizard de recuperacao
5. Implementar timer de reenvio de codigo
6. Aplicar validacoes de senha em tempo real
7. Testar fluxos completos

---

## Consideracoes

- O Supabase envia emails automaticamente com o codigo OTP
- Nao e necessario criar edge function para envio de email
- O codigo OTP e valido por 60 segundos a 1 hora dependendo da config
- A funcao `verifyOtp` com type 'email' autentica o usuario automaticamente
- Apos `verifyOtp` bem-sucedido, podemos chamar `updateUser` imediatamente

