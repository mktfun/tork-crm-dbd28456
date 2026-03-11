

# Corrigir view de seguradoras + Seed automático para novas contas

## Problemas Identificados

### Bug: View `companies_with_ramos_count` faltando `service_phone`
A view atual seleciona apenas `id, name, user_id, created_at, updated_at, ramos_count` -- **não inclui `service_phone` nem `assistance_phone`**. O hook `useSupabaseCompanies` tenta ler `company.service_phone` da view e recebe `undefined`, por isso o telefone nunca aparece e edições parecem "não funcionar" (o dado salva na tabela `companies`, mas a view que alimenta a listagem não retorna o campo).

### Seed: Contas novas sem dados pré-cadastrados
O trigger `handle_new_user()` só cria o perfil. Seguradoras, ramos e associações precisam ser populados automaticamente.

---

## Plano de Implementação

### 1. Migration: Corrigir a view (adicionar `service_phone` e `assistance_phone`)

```sql
DROP VIEW IF EXISTS public.companies_with_ramos_count;

CREATE VIEW public.companies_with_ramos_count AS
SELECT 
  c.id, c.name, c.user_id, c.created_at, c.updated_at,
  c.service_phone, c.assistance_phone,
  COUNT(cr.ramo_id) as ramos_count
FROM public.companies c
LEFT JOIN public.company_ramos cr ON c.id = cr.company_id AND cr.user_id = c.user_id
WHERE c.user_id = auth.uid()
GROUP BY c.id, c.name, c.user_id, c.created_at, c.updated_at, c.service_phone, c.assistance_phone;
```

Isso resolve o bug de edição/inserção/exclusão -- os dados já salvam corretamente na tabela, mas a view que alimenta a UI não os retornava.

### 2. Migration: Criar função `seed_user_defaults` + Atualizar trigger

Criar uma função `SECURITY DEFINER` que insere seguradoras, ramos e associações padrão para um novo usuário. Será chamada automaticamente pelo trigger `handle_new_user()`.

**Seguradoras com telefones de assistência 24h:**

| Seguradora | Telefone Atendimento |
|---|---|
| Porto Seguro | 0800 727 0800 |
| Bradesco Seguros | 0800 701 9090 |
| SulAmérica | 0800 727 2020 |
| Allianz | 0800 115 215 |
| Tokio Marine | 0800 721 2583 |
| HDI | 0800 771 2010 |
| Mapfre | 0800 775 4545 |
| Azul Seguros | 0800 703 1280 |
| Mitsui Sumitomo | 0800 721 7878 |
| Suhai | 0800 020 3040 |
| Zurich | 0800 284 4848 |
| Itaú Seguros | 0800 728 0079 |
| Liberty | 0800 709 6464 |
| Sompo | 0800 776 676 |

**Ramos padrão:** Automóvel, Vida, Saúde, Residencial, Empresarial, Condomínio, Transporte, Responsabilidade Civil, Fiança Locatícia, Viagem, Equipamentos

**Associações:** Cada seguradora será vinculada aos ramos que tipicamente oferece.

### 3. Atualizar `handle_new_user()` para chamar o seed

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', 'Usuário'), NEW.email, 'corretor');
  
  PERFORM public.seed_user_defaults(NEW.id);
  RETURN NEW;
END;
$$;
```

### 4. Sem mudanças no frontend
A tela de `GestaoSeguradoras` já suporta editar, excluir e toggle de ramos. Uma vez que a view seja corrigida, tudo funcionará normalmente.

---

## Resumo
- **1 migration SQL** com: fix da view + função de seed + trigger atualizado + dados das 14 seguradoras, 11 ramos e suas associações
- **0 mudanças no frontend** -- o código já está correto, o problema é a view incompleta

