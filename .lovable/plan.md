
# Correção do Erro: Navigate fora do contexto do Router

## Problema Identificado

O erro **"<Navigate> may be used only in the context of a <Router> component"** está ocorrendo na página `Landing.tsx` durante a renderização inicial da aplicação.

### Causa Raiz

O problema é uma **condição de corrida no ciclo de renderização** do React 18:

1. O `AuthProvider` usa `supabase.auth.getSession()` que pode retornar dados de sessão em cache quase imediatamente
2. Se o usuário já está logado, o hook `useAuth()` retorna `user` com dados antes que o contexto do Router esteja completamente pronto
3. O `Landing.tsx` tenta renderizar `<Navigate to="/dashboard">` durante esse período

A ordem de inicialização no `App.tsx` é:
```
BrowserRouter → QueryClientProvider → AuthProvider → TooltipProvider → Routes
```

O `AuthProvider` executa `getSession()` durante sua montagem, e se há uma sessão em cache, ele sincroniza o estado antes que a primeira renderização das `Routes` esteja completa.

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Landing.tsx` | Usar `useNavigate()` programático em vez de `<Navigate>` |
| `src/pages/Auth.tsx` | Mesma correção |
| `src/components/auth/ProtectedRoute.tsx` | Mesma correção |
| `src/layouts/SuperAdminLayout.tsx` | Mesma correção |
| `src/layouts/PortalLayout.tsx` | Mesma correção |

## Solução Proposta

Substituir o uso de `<Navigate>` declarativo por navegação programática com `useNavigate()` dentro de um `useEffect`. Isso garante que a navegação só aconteça após a montagem completa do componente.

### Exemplo de Correção (Landing.tsx)

**Antes:**
```tsx
if (user) {
    return <Navigate to="/dashboard" replace />;
}
```

**Depois:**
```tsx
const navigate = useNavigate();

useEffect(() => {
    if (!loading && user) {
        navigate('/dashboard', { replace: true });
    }
}, [user, loading, navigate]);

// Durante a transição, mostrar loading ou null
if (user) {
    return null; // ou um loading spinner
}
```

## Detalhes Técnicos

### Por que `useNavigate()` + `useEffect()` funciona?

1. **`useNavigate()`** é um hook que obtém a função de navegação do contexto do Router
2. **`useEffect()`** só executa após a renderização estar completa (incluindo o contexto do Router)
3. Isso garante que a navegação ocorra em um momento seguro do ciclo de vida do React

### Padrão de Correção para Todos os Arquivos

```tsx
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function Component() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    
    useEffect(() => {
        if (!loading && user) {
            navigate('/destino', { replace: true });
        }
    }, [user, loading, navigate]);
    
    if (loading) {
        return <LoadingScreen />;
    }
    
    if (user) {
        return null; // Navegação em progresso
    }
    
    return <ActualContent />;
}
```

## Arquivos que Precisam de Correção

1. **`src/pages/Landing.tsx`** (linha 62) - Redirect para `/dashboard` quando logado
2. **`src/pages/Auth.tsx`** (linha 38) - Redirect para página anterior quando logado
3. **`src/components/auth/ProtectedRoute.tsx`** (linha 66) - Redirect para `/` quando não autenticado
4. **`src/layouts/SuperAdminLayout.tsx`** (linha 67) - Redirect para `/dashboard` quando não admin
5. **`src/layouts/PortalLayout.tsx`** (linha 97) - Redirect para portal login

## Ordem de Implementação

1. Corrigir `Landing.tsx` (ponto de entrada principal)
2. Corrigir `Auth.tsx`
3. Corrigir `ProtectedRoute.tsx`
4. Corrigir `SuperAdminLayout.tsx`
5. Corrigir `PortalLayout.tsx`

## Validação

Após as correções:
1. Acessar `/` (Landing) - Deve carregar normalmente ou redirecionar sem erro
2. Acessar `/dashboard` sem login - Deve redirecionar para `/` sem erro
3. Acessar `/dashboard/super-admin` sem ser admin - Deve redirecionar sem erro
4. Console deve estar limpo de erros de Router
