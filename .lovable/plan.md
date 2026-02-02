
# Plano: Melhorias nas Páginas de Login e Cadastro

## Resumo
Vou refatorar as páginas de autenticação para torná-las mais ricas visualmente, adicionar recursos de segurança como validação de senha e confirmação, além de incluir o ícone "olhinho" para visualização de senha.

---

## Alterações na Página de LOGIN (Auth.tsx - modo login)

### 1. Link para Página de Compra/Planos
- Adicionar link "Conheça nossos planos" ou "Ver preços" que direciona para `/inicio#precos`
- Posicionar abaixo do botão de login ou no rodapé do formulário

### 2. Enriquecer Visualmente a Página
O painel esquerdo (desktop) ficará mais rico com:
- **Lista de benefícios** com ícones (similar ao Onboarding)
  - Agenda online 24/7
  - Dashboard em tempo real  
  - Gestão completa de clientes
  - Relatórios e exportações
- **Badge de número de usuários** (ex: "+500 negócios confiam no AgendaCerta")
- **Ícones decorativos** de funcionalidades flutuando no background

### 3. Toggle de Visibilidade da Senha (Olhinho)
- Adicionar estado `showPassword` 
- Ícone `Eye` / `EyeOff` do Lucide dentro do campo de senha
- Ao clicar, alterna entre `type="password"` e `type="text"`

---

## Alterações na Página de CADASTRO (Auth.tsx - modo signup)

### 1. Remover Campo de Telefone Fixo
- O cadastro atual só tem: nome, email e senha
- Confirmar que não há telefone fixo no Auth (verificado - não existe)
- **Nota**: O telefone fixo está no Onboarding, não no Auth

### 2. Requisitos de Senha
Adicionar validação visual em tempo real:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial (!@#$%^&*)

Exibir como checklist abaixo do campo:
```
✓ Mínimo 8 caracteres
✗ Uma letra maiúscula
✓ Um número
✗ Um caractere especial
```

### 3. Campo de Confirmar Senha
- Adicionar novo estado `confirmPassword`
- Campo adicional "Confirmar senha" 
- Validação: senhas devem ser iguais
- Erro visual se não coincidirem

### 4. Toggle de Visibilidade (Olhinho)
- Aplicar em ambos os campos de senha
- Estados independentes: `showPassword` e `showConfirmPassword`

---

## Alterações no Onboarding.tsx

### Remover Campo de Telefone Fixo
- Remover o campo "Telefone fixo (opcional)" das linhas 235-245
- Remover estado `phone` e referências
- Ajustar grid para melhor distribuição dos campos restantes

---

## Detalhes Técnicos

### Novos Estados em Auth.tsx
```typescript
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [confirmPassword, setConfirmPassword] = useState('');
```

### Componente de Input com Olhinho
```tsx
<div className="relative">
  <Input
    type={showPassword ? "text" : "password"}
    ...
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2"
  >
    {showPassword ? <EyeOff /> : <Eye />}
  </button>
</div>
```

### Função de Validação de Senha
```typescript
const getPasswordStrength = (password: string) => ({
  hasMinLength: password.length >= 8,
  hasUpperCase: /[A-Z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});
```

### Novos Imports
```typescript
import { Eye, EyeOff, Check, X } from 'lucide-react';
```

---

## Estrutura Visual Atualizada

### Login (Desktop)
```
┌─────────────────────────────────────────────────────────┐
│ [Painel Esquerdo - Gradiente]  │  [Painel Direito]      │
│                                │                        │
│  🏢 Logo                       │  BEM-VINDO             │
│  "AgendaCerta"                 │  Entre com suas        │
│                                │  credenciais           │
│  ✓ Agenda online 24/7         │                        │
│  ✓ Dashboard tempo real       │  [Email]               │
│  ✓ Gestão de clientes         │  [Senha 👁]            │
│  ✓ Relatórios completos       │  [Esqueci minha senha] │
│                                │                        │
│  "+500 negócios confiam"      │  [ENTRAR]              │
│                                │                        │
│  Política de Privacidade       │  Não tem conta?        │
│                                │  Cadastre-se           │
│                                │                        │
│                                │  🔗 Ver nossos planos  │
└─────────────────────────────────────────────────────────┘
```

### Cadastro
```
┌─────────────────────────────────────────────────────────┐
│  CRIAR CONTA                                            │
│  Preencha os dados para se cadastrar                    │
│                                                         │
│  [Nome completo]                                        │
│  [Email]                                                │
│  [Senha 👁]                                             │
│                                                         │
│  Requisitos da senha:                                   │
│  ✓ Mínimo 8 caracteres                                 │
│  ✗ Uma letra maiúscula                                 │
│  ✓ Um número                                           │
│  ✗ Um caractere especial                               │
│                                                         │
│  [Confirmar senha 👁]                                   │
│  ⚠ As senhas não coincidem (se diferentes)             │
│                                                         │
│  [CADASTRAR]                                            │
│                                                         │
│  Já tem conta? Entre                                    │
│  🔗 Ver nossos planos                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar
1. **src/pages/Auth.tsx** - Principal (login + cadastro)
2. **src/pages/Onboarding.tsx** - Remover telefone fixo

## Estimativa
Implementação direta, sem dependências externas adicionais.
