
# Remover Persistência de Navegação e Abas

## Alterações

### 1. `src/App.tsx`
- Remover import de `useNavigationPersist` e `NavigationPersistContext` (linha 10)
- Remover `const navigationPersist = useNavigationPersist()` (linha 117)
- Trocar `<NavigationPersistContext.Provider value={navigationPersist}>` por fragment `<>` (linha 128)
- Trocar `</NavigationPersistContext.Provider>` por `</>` (linha 165)
- Adicionar `useEffect` one-shot para limpar chaves legadas do localStorage (`navigation_state` e todas que começam com `tab_`)

### 2. `src/pages/Financeiro.tsx`
- Remover import `useTabPersist` (linha 2)
- Trocar `const { activeTab, onTabChange } = useTabPersist(...)` por `const [activeTab, onTabChange] = useState('overview')` (linha 29)

### 3. `src/pages/Configuracoes.tsx`
- Remover import `useTabPersist` (linha 5)
- Trocar `const { activeTab, onTabChange } = useTabPersist(...)` por `const [activeTab, onTabChange] = useState('venue')` (linha 85)

### 4. `src/pages/Relatorios.tsx`
- Remover import `useTabPersist` (linha 2)
- Trocar `const { activeTab, onTabChange } = useTabPersist(...)` por `const [activeTab, onTabChange] = useState('revenue')` (linha 56)

### 5. `src/pages/PublicPageConfig.tsx`
- Remover import `useTabPersist` (linha 19)
- Trocar `const { activeTab, onTabChange } = useTabPersist(...)` por `const [activeTab, onTabChange] = useState('branding')` (linha 82)

### 6. Deletar arquivos
- `src/hooks/useNavigationPersist.ts`
- `src/hooks/useTabPersist.ts`

### Não afetado
- `useFormPersist` permanece intacto para rascunhos de formulários
