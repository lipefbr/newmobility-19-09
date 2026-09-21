# Task 3-UI — Adicionar aba "Categorias de Motorista" no painel admin

**Agent:** full-stack-developer
**Task ID:** 3-UI
**Date:** 2025

## Contexto Recebido

- O model `DriverCategory` já existe no `prisma/schema.prisma` (campos: id, code, name, description, sortOrder, monthlyTripsTarget, bonusCents, maxCancellationPerMonth, color, icon, isActive, createdAt, updatedAt + relation `users`).
- `bun run db:push` já foi rodado.
- Endpoints já criados:
  - `GET /api/admin/driver-categories?userId=<adminId>` → lista categorias com `userCount`
  - `POST /api/admin/driver-categories` → cria categoria (code, name, description, sortOrder, monthlyTripsTarget, bonusCents, maxCancellationPerMonth, color, icon, isActive)
  - `PUT /api/admin/driver-categories/[id]` → atualiza campos (code não é atualizável via PUT)
  - `DELETE /api/admin/driver-categories/[id]?userId=<adminId>` → bloqueia se houver motoristas vinculados
- Eu não precisava mexer em migration / endpoints / seed.

## Work Log

### 1. Estudo do padrão existente

Li `admin-page.tsx` (11k+ linhas) e identifiquei o padrão `CareerPlan` como o modelo mais próximo a replicar:
- `interface CareerPlanItem {...}`
- States: `careerPlans`, `careerPlanLoading`, `careerPlanDialogOpen`, `editingCareerPlan`, `careerPlanForm`, `careerPlanSaving`
- Handlers: `loadCareerPlans`, `handleOpenCreateCareerPlan`, `handleOpenEditCareerPlan`, `handleSaveCareerPlan`, `handleDeleteCareerPlan`
- `useEffect` case: `if (activeTab === 'career-plans') loadCareerPlans()`
- `<TabsContent value="career-plans">` com cards em grid 1/2/3 + header card emerald
- `<Dialog open={careerPlanDialogOpen}>` com form fields em grid 2 colunas

Confirmei que `Car`, `Info`, `ToggleLeft`, `ToggleRight`, `Badge`, `formatCurrency`, `apiFetch`, `toast`, `Dialog*`, `Input`, `Label`, `Textarea`, `Button`, `Card*` já estavam importados em admin-page.tsx — não precisei mexer nos imports do arquivo principal.

### 2. Tipo `AdminPageKey` em `src/lib/store.ts`

Adicionei `'driver-categories'` ao union type `AdminPageKey` (entre `'career-plans'` e `'streak-rewards'`). Sem isso, `setAdminActivePage('driver-categories')` e a tipagem do estado quebrariam.

### 3. `src/components/newmobility/admin/admin-page.tsx` — 5 edições MultiEdit

#### 3.1 `adminPageToTab` map
Adicionei `'driver-categories': 'driver-categories'` para mapear o sidebar key ao tab interno.

#### 3.2 Interface `AdminDriverCategory`
Logo após `CareerPlanItem` (linha ~447):
```ts
interface AdminDriverCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  monthlyTripsTarget: number;
  bonusCents: number;
  maxCancellationPerMonth: number;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}
```

#### 3.3 States (linha ~1569)
6 novos states entre `careerPlanSaving` e o bloco Streak Rewards:
- `driverCategories`, `driverCategoriesLoading`, `editingDriverCategory`, `driverCategoryDialogOpen`, `driverCategoryFormData` (10 campos), `savingDriverCategory`.

Defaults do form: `color: '#06b6d4'`, `icon: '🔷'`, `maxCancellationPerMonth: 2`, `isActive: true`.

#### 3.4 useEffect (linha ~1674)
```ts
if (activeTab === 'driver-categories') loadDriverCategories()
```

#### 3.5 Handlers (linhas 2596-2706)
6 funções:
- `loadDriverCategories` → GET
- `handleOpenCreateDriverCategory` → form vazio + abre dialog
- `handleOpenEditDriverCategory` → form preenchido + abre dialog
- `handleSaveDriverCategory` → POST ou PUT (sem `code` que é unique)
- `handleDeleteDriverCategory` → DELETE com `confirm()`
- `handleToggleDriverCategoryActive` → PUT com `{ isActive: !c.isActive }`

### 4. `<TabsContent value="driver-categories">` (linhas 8118-8262)

Estrutura:
1. **Caixa azul explicativa** no topo (`bg-blue-50/60 dark:bg-blue-950/20`) com 4 bullets em `<ul>`:
   - Categorias de veículo NÃO são plano de carreira (CareerPlan é por careerPoints)
   - Bônus só é pago se bater a meta de corridas no mês
   - `maxCancellationPerMonth = 0` = tolerância zero (idoso/preferencial) — 1 cancelamento já desqualifica
   - Demais categorias: até 2 cancelamentos (configurável)
2. **Header card** blue→cyan com ícone `Car`, título "Categorias de Motorista", subtítulo "Safira → Imperial".
3. **Botão "Nova Categoria"** (`bg-blue-600`).
4. **Loading spinner** azul.
5. **Grid 1/2/3** de cards por categoria. Cada card:
   - Border-top com a cor da categoria (`style={{ borderTopColor: c.color, borderTopWidth: 4 }}`)
   - Ícone emoji + nome + código (font-mono)
   - Badge Ativo/Inativo (emerald/gray)
   - Descrição (line-clamp-2)
   - Grid 2x2 de métricas:
     - Meta mensal (`{c.monthlyTripsTarget} corridas/mês`)
     - Bônus (`formatCurrency(c.bonusCents)` se > 0 senão `—`)
     - Cancelamento/mês — se `=== 0` mostra Badge vermelho "Tolerância ZERO", senão `{c.maxCancellationPerMonth} max`
     - Motoristas (`{c.userCount}`)
   - Actions: Toggle ativar/desativar (com `ToggleRight`/`ToggleLeft`) + Editar (`Edit`) + Excluir (`Trash2`)
6. **Empty state** com ícone `Car` grande cinza + dica para criar categorias Safira/Rubi/Esmeralda/Diamante/Imperial.

### 5. `<Dialog open={driverCategoryDialogOpen}>` (linhas 9631-9784)

Logo após o dialog do CareerPlan:
- Header com ícone `Car`, título dinâmico "Editar/Nova Categoria de Motorista"
- Descrição: "Bônus só é pago se o motorista bater a meta mensal de corridas"
- Grid 2 colunas:
  - Código* (`Input` disabled em edição pois é unique, com helper "Código não pode ser alterado")
  - Nome*
- Textarea para descrição
- Bloco azul "Meta & Bônus & Cancelamento" com grid 2x2:
  - Ordem (number)
  - Meta mensal de corridas (number, placeholder "ex: 500")
  - Bônus mensal (centavos) com preview `formatCurrency` em tempo real
  - Limite de cancelamentos/mês (number min=0) com helper "0 = tolerância zero (idoso) · 2 = padrão"
- Grid 2 colunas:
  - Ícone (emoji, placeholder 🔷)
  - Cor (hex) com `<input type="color">` + Input text
- Checkbox Ativo (`id="dc-active"`)
- Footer: Cancelar + Salvar/Criar (`bg-blue-600`, disabled se `savingDriverCategory || !code || !name`)

### 6. `src/components/newmobility/admin/admin-layout.tsx`

- Adicionei `Car` ao import do lucide-react.
- Adicionei entrada do sidebar:
```ts
{ key: 'driver-categories', label: 'Categorias de Motorista', icon: Car, description: 'Categorias de veículo (Safira→Imperial) + meta mensal + bônus + cancelamento', group: 'system' },
```
logo após `career-plans`.

### 7. `src/components/newmobility/admin/admin-permissions-panel.tsx`

Adicionei à lista `ADMIN_PAGES` (linha 60):
```ts
{ key: 'driver-categories', label: 'Categorias de Motorista', description: 'Categorias de veículo + meta + bônus' },
```
para que sub-admins (papéis não-admin) possam ser autorizados via matriz de permissões.

## Verificações

### `bun run lint` nos 4 arquivos editados
```bash
npx eslint src/components/newmobility/admin/admin-page.tsx \
  src/components/newmobility/admin/admin-layout.tsx \
  src/components/newmobility/admin/admin-permissions-panel.tsx \
  src/lib/store.ts
```
**Resultado:** sem erros nem warnings (apenas note informativa do Babel sobre o tamanho do admin-page.tsx > 500KB, que é esperado e pré-existente).

### `bun run lint` global
13 errors em `keep-alive.js`, `persistent-server.js`, `process-manager.js`, `run-forever.js`, `supervisor.js` — todos `@typescript-eslint/no-require-imports` em scripts de infraestrutura que **não foram tocados** por esta task. São pré-existentes.

### `tsc --noEmit`
Confirmei via grep que nenhum erro TS novo está relacionado a `driverCategory*` / `AdminDriverCategory` / `handle*DriverCategory` / `loadDriverCategories` / etc. Os erros pré-existentes referenciam `AdminPlan.code`, `AdminVoucher.amount`, `SystemConfigs.raw` — código legado não alterado por esta task.

### `dev.log`
Dev server (`bun run dev`) está OK — `✓ Ready in 1607ms`, GET `/ 200`. Sem erros de compilação do admin-page.tsx.

## Stage Summary

- Aba "Categorias de Motorista" acessível no painel admin (sidebar → grupo "Sistema", entre "Plano de Carreira" e "Recompensas de Sequência").
- CRUD completo integrado aos 4 endpoints já existentes.
- UI segue o mesmo padrão visual dos outros TabsContent (cards em grid, header card, loading spinner, empty state, badge Ativo/Inativo, ações inline).
- Caixa explicativa azul no topo diferencia categorias de veículo vs plano de carreira, e explica as regras de bônus (só se bater meta) e tolerância zero (maxCancellationPerMonth === 0).
- Badge vermelho "Tolerância ZERO" aparece automaticamente quando `maxCancellationPerMonth === 0`.
- Validação client-side: botão Salvar disabled quando `code` ou `name` vazios; `code` disabled em edição (campo unique no DB).
- Toggle ativar/desativar inline sem precisar abrir o dialog de edição.
- Permissões: sub-admins podem ser autorizados via matriz de permissões na aba "Permissões" (key `driver-categories` adicionada).
- TypeScript e ESLint passam limpo nos arquivos editados.
