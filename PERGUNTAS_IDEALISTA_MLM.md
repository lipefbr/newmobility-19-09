# Perguntas para o Idealista do Projeto — Sistema Multi-Nível (MLM) NewMobility

> **Objetivo:** Este documento lista TODAS as perguntas necessárias para implementar corretamente o sistema de Multi-Nível (MLM) no backoffice/painel admin da NewMobility.  
> **Referência:** https://newmobility.app/backoffice.php e documentação fornecida pelo cliente.  
> **Status:** Aguardando respostas do idealista do projeto.

---

## Índice
1. [Planos CashBack (Blue 3 e Premium 5)](#1-planos-cashback-blue-3-e-premium-5)
2. [CashBack de Entrada (Circular)](#2-cashback-de-entrada-circular)
3. [CashBack Residual (7 Níveis)](#3-cashback-residual-7-níveis)
4. [CashBack de Vendas (9 Níveis)](#4-cashback-de-vendas-9-níveis)
5. [Gratificações e Bônus](#5-gratificações-e-bônus)
6. [Plano de Carreira (Pins/Categorias)](#6-plano-de-carreira-pinscategorias)
7. [PLR (Participação nos Lucros)](#7-plr-participação-nos-lucros)
8. [Motoristas (Drivers)](#8-motoristas-drivers)
9. [Auto-Upgrade e Migração de Planos](#9-auto-upgrade-e-migração-de-planos)
10. [Ciclos e Reset](#10-ciclos-e-reset)
11. [Regras de Qualificação e Bloqueio](#11-regras-de-qualificação-e-bloqueio)
12. [Integração com Serviços (Mobility, Delivery, Food, etc.)](#12-integração-com-serviços-mobility-delivery-food-etc)
13. [Admin: O que é Editável vs. Calculado](#13-admin-o-que-é-editável-vs-calculado)
14. [Referência ao Backoffice Original](#14-referência-ao-backoffice-original)
15. [Dados do Usuário e Exibição](#15-dados-do-usuário-e-exibição)

---

## 1. Planos CashBack (Blue 3 e Premium 5)

### 1.1. Blue 3 — R$ 150,00 (3 níveis)
- [ ] O valor de R$ 150,00 é **único** (pago uma vez) ou **recorrente** (mensal/anual)?
- [ ] Após o pagamento, o usuário recebe o cashback dos 3 níveis imediatamente ou apenas conforme os indicados pagam?
- [ ] A simulação mostra: Nível 1 = 4 usuários × 5% = R$ 30,00. O "5%" é sobre o R$ 150,00 do indicado (R$ 7,50 por indicado)? Ou sobre outro valor?
- [ ] Nível 2 = 16 usuários × 10% = R$ 240,00. Confirma que são 4 indicados por pessoa do nível 1 (4×4=16)?
- [ ] Nível 3 = 64 usuários × 10% = R$ 640,00. Confirma a progressão 4×4×4 = 64?
- [ ] Total Blue 3 = R$ 1.230,00. Este é o **teto máximo** que o usuário pode receber, ou pode receber mais se a rede crescer além do nível 3?

### 1.2. Premium 5 — R$ 849,00 (5 níveis)
- [ ] O valor de R$ 849,00 é **único** ou **recorrente**?
- [ ] Os 5 níveis são: Nível 1-3 (iguais ao Blue 3) + Nível 4 (256 usuários × 5%) + Nível 5 (1.024 usuários × 5%)?
- [ ] Nível 4 = 256 usuários. Confirma 4×4×4×4 = 256?
- [ ] Nível 5 = 1.024 usuários. Confirma 4×4×4×4×4 = 1.024?
- [ ] Total Premium 5 = R$ 63.936,00 (cashback) + R$ 32.899,00 (gratificações) = R$ 96.835,00. Confirma este total?
- [ ] As gratificações de R$ 32.899,00 são pagas **além** do cashback ou são **parte** dele?

### 1.3. Comparação e Transição
- [ ] Um usuário do Blue 3 pode fazer upgrade para Premium 5? Se sim, paga a diferença (R$ 849 - R$ 150 = R$ 699) ou o valor cheio?
- [ ] Ao fazer upgrade, a rede existente (níveis 1-3) é preservada ou resetada?
- [ ] Existem outros planos além do Blue 3 e Premium 5? (ex: Blue 2, Premium 7, etc.)

---

## 2. CashBack de Entrada (Circular)

### 2.1. Mecânica Básica
- [ ] O "CashBack Circular" significa que o valor pago pelo usuário (R$ 150 ou R$ 849) é **distribuído** para a rede acima dele, corretamente?
- [ ] A distribuição é **imediata** no momento do pagamento, ou há um período de **carência/liberação**?
- [ ] Se um indicado cancelar/reembolsar o pagamento, o cashback já distribuído é **estornado** dos superiores?

### 2.2. Percentuais por Nível
- [ ] Blue 3: Nível 1 = 5%, Nível 2 = 10%, Nível 3 = 10%. Total = 25% de R$ 150 = R$ 37,50 distribuído + R$ 112,50 fica com a empresa?
- [ ] Premium 5: Nível 1 = 5%, Nível 2 = 10%, Nível 3 = 10%, Nível 4 = 5%, Nível 5 = 5%. Total = 35% de R$ 849 = R$ 297,15 distribuído?
- [ ] O percentual é **fixo** ou o admin pode configurar diferentes percentuais por nível?
- [ ] Se o admin alterar um percentual, a mudança aplica-se **apenas a novos pagamentos** ou **retroativamente**?

### 2.3. Quantidade de Usuários por Nível
- [ ] Cada usuário pode indicar **no máximo 4 pessoas** (matriz 4×N) ou **ilimitado**?
- [ ] Se ilimitado, como fica a distribuição quando há mais de 4 indicados diretos? (Spillover? Compressão?)
- [ ] A simulação assume matriz 4×4×4... = 4, 16, 64, 256, 1.024. Esta é a estrutura **obrigatória** ou apenas ilustrativa?

---

## 3. CashBack Residual (7 Níveis)

### 3.1. Regras Básicas
- [ ] O CashBack Residual é **mensal** e baseado no **faturamento da rede** (consumos de mobilidade, delivery, food, etc.)?
- [ ] O "1º mês pago pela empresa" significa que a empresa injeta R$ 1.399,00 no primeiro mês para iniciar o sistema?
- [ ] Após o 1º mês, o residual é calculado sobre o **faturamento real** da rede nos 7 níveis?

### 3.2. Percentuais Residuais
- [ ] Nível 1 = 5%, Nível 2 = 5,5%, Nível 3 = 6%, Nível 4 = 6,5%, Nível 5 = 7%, Nível 6 = 7,5%, Nível 7 = 8%. Confirma?
- [ ] O percentual é sobre o **faturamento total** de cada nível, ou sobre o **lucro** da empresa?
- [ ] O total de R$ 1.399,00/mês é uma **meta** ou uma **garantia mínima**?

### 3.3. Condições de Recebimento
- [ ] Para receber o residual, o usuário precisa estar **ativo** (pagamento em dia)? 
- [ ] Há um **volume mínimo** de consumo próprio ou da rede para qualificar?
- [ ] Se um usuário do nível 3 ficar inativo, o residual "sobe" para o nível 2 ou é **perdido**?

---

## 4. CashBack de Vendas (9 Níveis)

### 4.1. Mecânica
- [ ] O CashBack de Vendas é baseado nas **vendas de produtos/serviços** feitas pela rede (marketplace, shoppings, etc.)?
- [ ] São 9 níveis com percentuais: Nível 1-8 = 0,10% cada, Nível 9 = 0,20%. Confirma?
- [ ] O total de 0,90% (8×0,10% + 0,20%) é sobre o **valor da venda**?

### 4.2. Distribuição
- [ ] A distribuição é **imediata** por venda, ou **consolidada** mensalmente?
- [ ] Se um produto for devolvido, o cashback de vendas é estornado?
- [ ] Há categorias de produtos que **não geram** cashback de vendas?

---

## 5. Gratificações e Bônus

### 5.1. Bônus de Equipe
- [ ] Qual é o **critério de qualificação** para o Bônus de Equipe? (Ex: X indicados ativos no nível 1?)
- [ ] Qual o **valor/percentual** do bônus?
- [ ] É pago **mensal**, **semanal**, ou **pontual**?

### 5.2. Bônus de Compra de App
- [ ] O que significa "Bônus de Compra de App"? É um bônus quando alguém da rede compra um plano?
- [ ] Qual o percentual/valor?
- [ ] Aplica-se a **qualquer nível** ou apenas aos diretos (nível 1)?

### 5.3. Bônus de Liderança
- [ ] Qual o critério para o Bônus de Liderança? (Ex: alcançar um pin específico?)
- [ ] É **acumulado** com outros bônus ou **exclusivo**?
- [ ] Valor/percentual?

### 5.4. Bônus de Meta
- [ ] Quais são as **metas** que qualificam para este bônus? (Volume? Indicações? Faturamento?)
- [ ] As metas são **individuais** ou **de equipe**?
- [ ] Período de avaliação: mensal, trimestral, anual?

### 5.5. Prêmios Físicos (Carros, Casas, etc.)
- [ ] Liste TODOS os prêmios físicos e seus critérios:
  - [ ] Carro (qual modelo/valor? Qual critério?)
  - [ ] Casa (qual valor? Qual critério?)
  - [ ] Outros (viagens, eletrônicos, etc.)
- [ ] Os prêmios são **entregues** (propriedade) ou **cedidos** (uso enquanto qualificado)?
- [ ] Se o usuário perder a qualificação, o prêmio é **retirado**?

---

## 6. Plano de Carreira (Pins/Categorias)

### 6.1. Estrutura de Pins
Confirme a estrutura e critérios de cada pin:

| Pin | Nome | Renda Mensal | Critério de Qualificação |
|-----|------|--------------|--------------------------|
| 1 | Básico | ? | ? |
| 2 | Esmeralda | R$ 2.000 | ? |
| 3 | Rubi | R$ 3.000 | ? |
| 4 | Safira | R$ 4.000 | ? |
| 5 | Diamante | R$ 5.000 | ? |
| 6 | Imperial | R$ 6.000 | ? |

- [ ] Os valores de "Renda Mensal" são **garantidos** pela empresa ou **estimativas**?
- [ ] Qual o critério exato para subir de pin? (Pontos? Volume? Indicações? Combinação?)
- [ ] Há **período mínimo** em cada pin antes de subir?
- [ ] Pode **regredir** de pin? Se sim, qual o critério?

### 6.2. Pontuação
- [ ] Como funcionam os **pontos de carreira**? (Cada indicação vale X pontos? Cada venda vale Y pontos?)
- [ ] Os pontos **expiram** ou são **vitalícios**?
- [ ] Há **pontos diferenciais** por tipo de atividade? (Ex: indicação = 10 pts, venda = 5 pts, consumo = 2 pts)

---

## 7. PLR (Participação nos Lucros)

### 7.1. Mecânica
- [ ] O PLR é **0,9% do faturamento total** do app, distribuído em **9 níveis** (0,10% cada)?
- [ ] A distribuição é **igualitária** entre os 9 níveis ou **proporcional** ao volume de cada nível?
- [ ] O PLR é pago **mensalmente**, **trimestralmente**, ou **anualmente**?

### 7.2. Qualificação
- [ ] Quem se qualifica para o PLR? (Todos os usuários ativos? Apenas Premium 5? A partir de um pin específico?)
- [ ] Há um **volume mínimo** de rede para receber PLR?
- [ ] O PLR é **cumulativo** com o CashBack Residual ou **exclusivo**?

---

## 8. Motoristas (Drivers)

### 8.1. Comissão e Metas
- [ ] O motorista recebe **76% do valor da corrida**. Os 24% restantes são divididos como? (Empresa? Cashback rede? PLR?)
- [ ] Meta diária = 16 corridas. Meta mensal = 384 corridas. Confirma? (16×24 = 384)
- [ ] Rendimento estimado = R$ 8.755,00/mês. Este valor já inclui o cashback ou é apenas das corridas?

### 8.2. Bônus de Motorista
- [ ] Há bônus por **bater a meta diária/mensal**?
- [ ] Há bônus por **avaliação** (estrelas)?
- [ ] Motoristas participam do **PLR** e **CashBack Residual**?
- [ ] Motorista pode **indicar** outros motoristas/usuários e ganhar cashback de entrada?

### 8.3. Categorias de Serviço
- [ ] O percentual de 76% é **igual** para todas as categorias (Mobilidade, Delivery, Food, Pharmacy, etc.)?
- [ ] Se diferente, liste os percentuais por categoria.

---

## 9. Auto-Upgrade e Migração de Planos

### 9.1. Regra do Auto-Upgrade
- [ ] "Após completar o 3º nível, o usuário gera uma fatura de R$ 849 para upgrade para Premium 5." Confirma?
- [ ] O auto-upgrade é **obrigatório** ou **opcional**?
- [ ] Se o usuário **recusar** o upgrade, o que acontece? (Perde a rede? Congela no Blue 3? Continua normalmente?)

### 9.2. Timing
- [ ] A fatura de R$ 849 é gerada **automaticamente** ao completar o nível 3, ou o admin dispara manualmente?
- [ ] Há um **prazo** para pagamento da fatura de upgrade?
- [ ] Se não pagar no prazo, qual a consequência?

### 9.3. Preservação de Rede
- [ ] Ao fazer upgrade Blue 3 → Premium 5, a rede de 3 níveis é **preservada** e expandida para 5?
- [ ] Os cashbacks já recebidos do Blue 3 são **mantidos** ou **zerados**?
- [ ] O residual já acumulado é mantido?

---

## 10. Ciclos e Reset

### 10.1. Ciclo do CashBack de Entrada
- [ ] O CashBack de Entrada (R$ 1.230 ou R$ 63.936) é **único por ciclo** ou **recorrente**?
- [ ] Após completar todos os níveis, o usuário **reinicia** o ciclo (nova matriz)?
- [ ] Se reiniciar, a rede anterior é **mantida** ou **resetada**?

### 10.2. Reset Mensal/Anual
- [ ] Há algum **reset periódico** de saldos, pontos ou qualificações?
- [ ] Se sim, qual a **frequência** e o que é resetado?
- [ ] Os cashbacks **já recebidos** são protegidos do reset?

---

## 11. Regras de Qualificação e Bloqueio

### 11.1. Inatividade
- [ ] Após quantos dias de inatividade (sem pagamento/consumo) o usuário é **bloqueado**?
- [ ] O que acontece com a rede de um usuário bloqueado? (Vai para o superior? Congela?)
- [ ] Há como **reativar** após bloqueio? Se sim, como?

### 11.2. Suspensão/Banimento
- [ ] O admin pode **suspender** um usuário? Se sim, o que acontece com a rede dele?
- [ ] Há diferença entre **suspensão temporária** e **banimento permanente**?
- [ ] Em caso de banimento, os cashbacks já recebidos são **estornados**?

### 11.3. Fraudador/Chargeback
- [ ] Se um usuário fizer **chargeback** (estorno no cartão), o que acontece com os cashbacks distribuídos para a rede?
- [ ] Há penalidade para o usuário que fez chargeback?
- [ ] O sistema deve **bloquear automaticamente** em caso de chargeback?

---

## 12. Integração com Serviços (Mobility, Delivery, Food, etc.)

### 12.1. Serviços Integrados
Confirme quais serviços estão integrados e se geram cashback/residual:

| Serviço | Gera CashBack Entrada? | Gera Residual? | Gera Vendas? |
|---------|------------------------|-----------------|--------------|
| Mobilidade (Corridas) | ? | ? | ? |
| Delivery | ? | ? | ? |
| Food (Restaurantes) | ? | ? | ? |
| Shopping | ? | ? | ? |
| Pharmacy (Farmácia) | ? | ? | ? |
| Pet Care | ? | ? | ? |
| Health (Saúde) | ? | ? | ? |
| Education (Educação) | ? | ? | ? |

### 12.2. Percentuais por Serviço
- [ ] Cada serviço tem um **percentual diferente** de geração de cashback/residual?
- [ ] Se sim, forneça a tabela de percentuais por serviço.
- [ ] Há serviços que **não geram** nenhum tipo de cashback?

---

## 13. Admin: O que é Editável vs. Calculado

### 13.1. Valores Editáveis pelo Admin
Liste exatamente o que o admin pode editar no painel:

- [ ] **Preços dos planos** (Blue 3: R$ 150, Premium 5: R$ 849)? Pode alterar?
- [ ] **Percentuais de cashback** por nível (5%, 10%, etc.)? Pode alterar?
- [ ] **Quantidade de níveis** (3, 5, 7, 9)? Pode alterar a estrutura?
- [ ] **Quantidade de usuários por nível** (matriz 4×N)? Pode alterar para 5×N, 6×N?
- [ ] **Valores das gratificações**? Pode criar/editar/excluir?
- [ ] **Critérios dos pins** de carreira? Pode alterar?
- [ ] **Percentual do PLR** (0,9%)? Pode alterar?
- [ ] **Comissão do motorista** (76%)? Pode alterar?
- [ ] **Metas diárias/mensais** do motorista? Pode alterar?
- [ ] **Valor do residual mensal** (R$ 1.399)? Pode alterar?

### 13.2. Valores Calculados Automaticamente
Liste o que o sistema calcula sozinho (sem intervenção do admin):

- [ ] Cashback de entrada por usuário (baseado nos pagamentos da rede)?
- [ ] Cashback residual por usuário (baseado no faturamento da rede)?
- [ ] Cashback de vendas por usuário (baseado nas vendas da rede)?
- [ ] Progressão de pin de carreira?
- [ ] Qualificação para gratificações/prêmios?
- [ ] Auto-upgrade Blue 3 → Premium 5?

### 13.3. Edição Manual de Usuários
- [ ] O admin pode **editar manualmente** o saldo de cashback de um usuário? (Para correções?)
- [ ] O admin pode **mover** um usuário de posição na rede?
- [ ] O admin pode **adicionar manualmente** pontos de carreira?
- [ ] O admin pode **forçar** um upgrade/downgrade de plano?

---

## 14. Referência ao Backoffice Original

> Link: https://newmobility.app/backoffice.php

### 14.1. Funcionalidades do Backoffice Original
- [ ] Quais funcionalidades do backoffice original (backoffice.php) **devem ser replicadas** no novo painel?
- [ ] Quais funcionalidades do backoffice original **não devem** ser replicadas (obsoletas)?
- [ ] Há funcionalidades **novas** que o backoffice original não tinha e devem ser adicionadas?

### 14.2. Layout e UX
- [ ] O layout do novo painel deve **seguir** o estilo do backoffice.php ou pode ser diferente?
- [ ] Há **cores/identidade visual** específica da NewMobility a usar? (Azul? Verde? Outra?)
- [ ] Há **logo** oficial para integrar?

### 14.3. Dados Históricos
- [ ] Há **dados de usuários reais** no backoffice.php que precisam ser **migrados** para o novo sistema?
- [ ] Se sim, como acessar esses dados? (Export SQL? API? CSV?)
- [ ] A estrutura de rede (indicações existentes) deve ser **preservada** na migração?

---

## 15. Dados do Usuário e Exibição

### 15.1. O que o usuário vê no painel dele
- [ ] O usuário vê o **total potencial** de cashback (R$ 1.230 para Blue 3) ou apenas o **já recebido**?
- [ ] O usuário vê a **rede completa** (todos os níveis) ou apenas os **diretos** (nível 1)?
- [ ] O usuário vê o **progresso** em direção ao auto-upgrade?
- [ ] O usuário vê as **gratificações** que pode receber e os critérios?
- [ ] O usuário vê o **plano de carreira** completo e onde está?

### 15.2. Transparência
- [ ] O usuário pode ver **quem** são seus indicados (nome, email)? Ou apenas **quantidade**?
- [ ] O usuário pode ver **quanto** cada indicado gerou de cashback para ele?
- [ ] Há **limitação** de dados visíveis por nível? (Ex: vê nomes do nível 1, mas apenas stats do nível 2+?)

### 15.3. Notificações
- [ ] Quais eventos devem gerar **notificação** para o usuário? (Novo indicado? Cashback recebido? Upgrade? Pin?)
- [ ] As notificações são **por email**, **push**, **in-app**, ou **todos**?
- [ ] Há preferências de notificação que o usuário pode configurar?

---

## Resumo de Prioridades para Implementação

Após receber as respostas, a implementação seguirá esta ordem de prioridade:

1. **CRÍTICO** — Planos e preços (Blue 3, Premium 5) + estrutura de matriz
2. **CRÍTICO** — CashBack de Entrada (distribuição automática nos pagamentos)
3. **CRÍTICO** — CashBack Residual (cálculo mensal baseado em faturamento)
4. **ALTO** — Auto-upgrade Blue 3 → Premium 5
5. **ALTO** — Plano de Carreira (pins e progressão)
6. **ALTO** — Gratificações e bônus (qualificação e pagamento)
7. **MÉDIO** — PLR (distribuição de lucros)
8. **MÉDIO** — CashBack de Vendas (9 níveis)
9. **MÉDIO** — Motoristas (comissões e metas)
10. **BAIXO** — Prêmios físicos (carros, casas)
11. **BAIXO** — Migração de dados do backoffice.php

---

## Como Responder

Para cada pergunta, marque:
- ✅ **Confirmado** — o item está correto como descrito
- ❌ **Incorreto** — explique o que está errado
- ⚠️ **Parcial** — explique o que falta ou o que ajustar
- ➕ **Adicional** — inclua informações não contempladas nas perguntas

> **Contato:** Responder diretamente neste documento ou em arquivo separado anexo.  
> **Prazo sugerido:** 7 dias para permitir implementação sem bloqueios.

---

*Documento criado em: 2025-01-XX*  
*Projeto: NewMobility Super App*  
*Referência: https://newmobility.app/backoffice.php*
