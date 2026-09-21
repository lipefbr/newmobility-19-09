# Perguntas para o Idealista do Projeto NewMobility

> **Contexto**: Este documento lista todas as perguntas que precisam ser respondidas pelo idealista do projeto NewMobility para que o sistema multi-nível (MMN) seja implementado corretamente no backoffice e painel administrativo. As perguntas são baseadas na apresentação oficial do projeto e em pontos que precisam de esclarecimento técnico.

---

## 📋 Índice

1. [Estrutura das Matrizes (CashBack Entrada)](#1-estrutura-das-matrizes-cashback-entrada)
2. [CashBack Residual](#2-cashback-residual)
3. [Upgrade Blue 3 → Premium 5](#3-upgrade-blue-3--premium-5)
4. [PLR — Participação de Lucros e Resultados](#4-plr--participação-de-lucros-e-resultados)
5. [Gratificações](#5-gratificações)
6. [Plano de Carreira (Pins/Cargos)](#6-plano-de-carreira-pinscargos)
7. [Taxa de Uso e Voucher Inicial](#7-taxa-de-uso-e-voucher-inicial)
8. [CashBack de Indicação (5%-10%)](#8-cashback-de-indicação-5-10)
9. [Metas de Motorista e Entregador](#9-metas-de-motorista-e-entregador)
10. [Pins e Categorias de Veículos](#10-pins-e-categorias-de-veículos)
11. [Eventos e Prêmios de Elite](#11-eventos-e-prêmios-de-elite)
12. [Integração de Apps (Refeição, Shopping, Farmácia, Pet)](#12-integração-de-apps-refeição-shopping-farmácia-pet)
13. [Serviços de Benefícios (Auto, Saúde, Educação)](#13-serviços-de-benefícios-auto-saúde-educação)
14. [Previdência Privada e Seguros](#14-previdência-privada-e-seguros)
15. [Fluxo de Pagamentos e Saques](#15-fluxo-de-pagamentos-e-saques)
16. [Comissões e Repasses](#16-comissões-e-repasses)
17. [Regras de Qualificação e Inatividade](#17-regras-de-qualificação-e-inatividade)
18. [BackOffice — Visão do Usuário](#18-backoffice--visão-do-usuário)
19. [Painel Administrativo — Visão do Admin](#19-painel-administrativo--visão-do-admin)
20. [Funcionalidades Técnicas e Regras de Negócio](#20-funcionalidades-técnicas-e-regras-de-negócio)

---

## 1. Estrutura das Matrizes (CashBack Entrada)

### 1.1 — Plano Blue 3 (R$ 150,00)
A apresentação mostra:
- **Nível 1**: 4 usuários × 5% = R$ 7,50 cada = R$ 30,00
- **Nível 2**: 16 usuários × 10% = R$ 15,00 cada = R$ 240,00
- **Nível 3**: 64 usuários × 10% = R$ 15,00 cada = R$ 960,00
- **Total**: R$ 1.230,00

**Perguntas:**
- [ ] A matriz é **4×3** (4 indicações diretas, 3 níveis de profundidade)?
- [ ] As 4 vagas do nível 1 são preenchidas **por indicação direta** ou por **spillover** (transbordamento automático do upline)?
- [ ] Se um usuário do nível 1 indicar alguém, esse alguém ocupa uma vaga no nível 2 do indicador original?
- [ ] O percentual de 5%/10%/10% é **fixo** ou varia conforme algum critério?
- [ ] O cashback é creditado **imediatamente** quando o indicado paga a taxa de R$ 150, ou há um período de carência/confirmação?
- [ ] O cashback entra em qual carteira? (Saque, Mobilidade, Shopping, etc.)
- [ ] Se o indicado cancelar/reembolsar, o cashback já pago é estornado?

### 1.2 — Plano Premium 5 (R$ 849,00)
A apresentação mostra:
- **Nível 1**: 4 usuários × 5% = R$ 42,45
- **Nível 2**: 16 usuários × 10% = R$ 84,90
- **Nível 3**: 64 usuários × 10% = R$ 84,90
- **Nível 4**: 256 usuários × 5% = R$ 49,95
- **Nível 5**: 1.024 usuários × 5% = R$ 49,95
- **Total CashBack**: R$ 72.127,80

**Perguntas:**
- [ ] A matriz é **4×5** (4 indicações, 5 níveis)?
- [ ] Os percentuais do 4º e 5º nível são **5%** cada (confirmar)?
- [ ] O valor base para cálculo é sempre **R$ 849,00**? Ou muda conforme o nível?
- [ ] Há limite máximo de ganho por nível ou por mês?
- [ ] A matriz Premium 5 é uma **extensão** da Blue 3 ou uma **matriz separada**?
- [ ] Ao fazer upgrade de Blue 3 para Premium 5, a rede existente (84 pessoas) é **migrada** ou começa do zero?

---

## 2. CashBack Residual

A apresentação mostra 7 níveis com mensalidade de R$ 1.399,00:
- **Nível 1**: 4 usuários × R$ 139,90 = R$ 559,60
- **Nível 2**: 16 usuários × R$ 125,91 = R$ 2.014,56
- **Nível 3**: 64 usuários × R$ 69,95 = R$ 4.476,80
- **Nível 4**: 256 usuários × R$ 69,95 = R$ 17.907,20
- **Nível 5**: 1.024 usuários × R$ 55,96 = R$ 57.303,04
- **Nível 6**: 4.096 usuários × R$ 41,97 = R$ 171.909,12
- **Nível 7**: 16.384 usuários × R$ 27,98 = R$ 458.424,32
- **Total**: R$ 759.094,64

**Perguntas:**
- [ ] A mensalidade de **R$ 1.399,00** é cobrada de **todos os usuários** ou apenas dos que atingiram um certo nível?
- [ ] A **1ª mensalidade é paga pela NewMobility** — a partir de quando o usuário começa a pagar? (Mês 2? Após completar nível X?)
- [ ] Os percentuais por nível (10%, 9%, 5%, 5%, 4%, 3%, 2%) — confirmar valores exatos.
- [ ] O CashBack Residual é **separado** do CashBack de Entrada ou **integrado**?
- [ ] A matriz Residual é 4×7 (4 indicações, 7 níveis)?
- [ ] Se o downline não pagar a mensalidade, ele é **desativado** ou apenas **não gera cashback** no mês?
- [ ] Há **carência** ou **período de teste** antes da primeira cobrança?
- [ ] O residual é creditado **mensalmente** (recorrente) ou apenas no mês do pagamento?
- [ ] Em qual carteira o residual é creditado?

---

## 3. Upgrade Blue 3 → Premium 5

A apresentação tem duas informações conflitantes:
> "Após entrar 28 usuários no 3º nível o sistema irá **descontar automático** os R$ 849,00 que falta da taxa de uso"

> "Após completar o 3º nível, o usuário **precisará gerar a fatura e pagar** o valor de R$ 849,00"

**Perguntas:**
- [ ] O upgrade é **automático** (descontado do saldo de cashback) ou **manual** (usuário gera fatura e paga via PIX)?
- [ ] Se automático: é descontado de qual carteira? (Saque, Gratificação, etc.)
- [ ] Se manual: o que acontece se o usuário não pagar? Perde a rede? Fica bloqueado?
- [ ] "28 usuários no 3º nível" — isso significa 28 dos 64 preenchidos?
- [ ] Após o upgrade, os ganhos do Blue 3 (R$ 1.230) são **somados** aos do Premium 5 ou **substituídos**?
- [ ] Há um prazo para fazer o upgrade após atingir o critério?

---

## 4. PLR — Participação de Lucros e Resultados

A apresentação mostra:
- **0,9%** das receitas de vendas/serviços dos Apps distribuído em **9 níveis**
- Cada nível recebe **0,10%**
- Base: R$ 349.524.000,00 → R$ 3.145.716,00 distribuídos
- **Nível 1**: 4 usuários → R$ 4,00 cada
- **Nível 9**: 262.144 usuários → R$ 262.144,00 cada

**Perguntas:**
- [ ] O PLR é calculado sobre as **vendas totais do mês** da empresa ou sobre as **vendas da própria rede** do usuário?
- [ ] A distribuição é **mensal**? Qual o dia do crédito?
- [ ] Precisa ter **todos os 9 níveis preenchidos** para receber, ou recebe proporcional ao preenchido?
- [ ] O usuário precisa estar **ativo** (pagou mensalidade residual) para receber PLR?
- [ ] O valor de R$ 1.000,00 mencionado como "valor de referência" — é o valor **mínimo** garantido ou apenas ilustrativo?
- [ ] "Quanto mais usar nosso serviço... maior será sua participação" — o PLR aumenta conforme o uso pessoal do app? Como?
- [ ] O PLR entra em qual carteira? (Saque, Gratificação?)
- [ ] Há impostos/retenções sobre o PLR?

---

## 5. Gratificações

A apresentação lista diversas gratificações:
- **Blue 3**: Equipe Mobilidade R$ 500 + App R$ 500 + Liderança R$ 500 = R$ 1.500
- **Premium 5**: Equipe Mobilidade R$ 1.000 + R$ 2.000 + App R$ 2.000 + R$ 4.000 + Previdência R$ 500
- **Residual**: Equipe R$ 500/R$ 1.000/R$ 1.000 + App R$ 5.000/R$ 10.000/R$ 12.000/R$ 16.000

**Perguntas:**
- [ ] **Gratificação de Equipe Mobilidade** — qual a meta exata? (Ex: completar nível X? bater Y corridas?)
- [ ] **Gratificação de Compra no App** — é por atingir volume de compras na rede? Qual o valor/alvo?
- [ ] **Gratificação de Liderança** — baseada em quê? (Número de líderes na equipe? Pontos?)
- [ ] **Gratificação de Alcance de Metas** — metas mensais? Semanais? Diárias?
- [ ] As gratificações são **únicas** (pagas uma vez ao atingir) ou **recorrentes** (mensais enquanto mantiver)?
- [ ] Em qual carteira são creditadas? (Saque, Gratificação, Mobilidade?)
- [ ] **Prêmios físicos** (carro, moto, casa, móveis) — em qual momento são entregues? Há checklist de qualificação?
- [ ] **Seguro de vida, seguro do carro/moto, plano odontológico, telemedicina** — são ativados automaticamente ao qualificar ou o usuário solicita?
- [ ] **Kit mimo, vale refeição, vale alimentação** — valores mensais? Por quanto tempo?
- [ ] **Férias com 6 e 12 meses** — como funciona? Valor? Período?
- [ ] **Reembolso vale ducha** — valor mensal? Condições?
- [ ] **Auxílio combustível** — valor? Mensal? Condições?

---

## 6. Plano de Carreira (Pins/Cargos)

A apresentação mostra pins com valores:
- **Básicos**: Esmeralda R$ 2.000 / Rubi R$ 3.000
- **Avançados**: Safira R$ 4.000 / Diamante R$ 5.000 / Imperial R$ 6.000
- **Especiais**: Entrega Documentos R$ 3.000 / Pick-up R$ 4.000 / Furgão R$ 3.000 / Caminhão R$ 4.000

**Perguntas:**
- [ ] Esses valores são **bônus de conquista** (pagos uma vez ao atingir o pino) ou **salário mensal**?
- [ ] Quais os **critérios exatos** para qualificar em cada pino? (Ex: X pontos, Y indicações, Z volume)
- [ ] Há **manutenção mensal** para manter o pino? Ou é vitalício após conquista?
- [ ] Os pins **Básicos/Avançados** são para usuários em geral e os **Especiais** apenas para motoristas/entregadores?
- [ ] "Categorias especiais: regras e condições no site" — pode detalhar essas regras?
- [ ] Há **plano de carreira** separado para: (a) usuário comum, (b) motorista, (c) entregador, (d) comércio?
- [ ] O PLUS de gratificação ao bater meta diária após 4º nível — qual o valor exato?
- [ ] A "evolução de carreira" mencionada nas gratificações — como funciona o sistema de pontos?

---

## 7. Taxa de Uso e Voucher Inicial

- **Taxa de Uso**: R$ 150,00 iniciais (acompanhe no BackOffice)
- **Voucher**: R$ 30,00 para presentear um amigo usuário
- **Indicação Bônus**: 5% a 10% de CashBack ao indicar amigos

**Perguntas:**
- [ ] A taxa de R$ 150,00 é paga **uma única vez** na inscrição? Tem renovação (anual, mensal)?
- [ ] Os R$ 150,00 habilitam apenas o **Blue 3** ou já incluem algo mais?
- [ ] O voucher de R$ 30,00 é creditado para o **indicador** presentear um amigo — como funciona o resgate? Tem validade?
- [ ] O voucher precisa ser **usado** (enviado a um amigo) ou pode ser sacado?
- [ ] "5% a 10% de CashBack ao indicar amigos" — sobre o quê? (Taxa de uso? Plano? Compras futuras?)
- [ ] A variação de 5% a 10% depende de quê? (Nível do indicado? Plano? Volume?)

---

## 8. CashBack de Indicação (5%-10%)

**Perguntas:**
- [ ] O cashback de 5%-10% é **além** do cashback da matriz (5%/10%/10%) ou é o mesmo?
- [ ] É pago sobre a **taxa de R$ 150** ou sobre **todas as compras futuras** do indicado?
- [ ] A porcentagem varia conforme o plano do indicado (Blue 3 vs Premium 5)?
- [ ] Há limite de indicações diretas? (A matriz suporta 4 no nível 1)
- [ ] Indicações além da 4ª vão para o **nível 2** (spillover) ou são **perdidas**?

---

## 9. Metas de Motorista e Entregador

A apresentação mostra:
- **Meta diária**: 16 corridas (≈8h), 2 corridas/hora
- **Ticket médio**: R$ 30,00
- **Meta mensal**: 384 corridas
- **Receita estimada**: R$ 8.755,20/mês (76% líquido = R$ 22,80/corrida)

**Perguntas:**
- [ ] A receita de R$ 8.755,20 é **bruta** ou **líquida**? (Apresentação sugere líquida com 76%)
- [ ] Os 24% da taxa fixa cobrem quê exatamente? (Comissão da plataforma? Impostos? Seguro?)
- [ ] A meta de 384 corridas/mês é **obrigatória** para receber gratificações ou **opcional** (bônus)?
- [ ] O PLUS de gratificação após 4º nível — é **por corrida** ou **valor fixo mensal**?
- [ ] Entregadores têm metas diferentes? (Número de entregas, ticket médio)
- [ ] Há **ranking** semanal/mensal de motoristas? Premiações extras?
- [ ] Motorista pode ser também **usuário do cashback** (matriz)? Os ganhos se somam?
- [ ] "Assistência de viagem para idosos e pessoas com mobilidade reduzida" — é obrigatório para categorias básicas/avançadas? Como funciona?

---

## 10. Pins e Categorias de Veículos

- **Básicos**: Esmeralda R$ 2.000 / Rubi R$ 3.000
- **Avançados**: Safira R$ 4.000 / Diamante R$ 5.000 / Imperial R$ 6.000
- **Especiais**: Entrega Documentos R$ 3.000 / Pick-up R$ 4.000 / Furgão R$ 3.000 / Caminhão R$ 4.000

**Perguntas:**
- [ ] Esses valores são **taxas de adesão** pagas pelo motorista, **caução**, ou **bônus recebidos**?
- [ ] O motorista escolhe sua categoria no cadastro? Pode ter múltiplas?
- [ ] Há **requisitos de veículo** por categoria? (Ano, modelo, inspeção)
- [ ] Categorias especiais (Pick-up, Furgão, Caminhão) — têm regras de **logística** específicas?
- [ ] "Categorias básicos e avançados devem atender Assistência de viagem para idosos e PCD" — é um serviço adicional obrigatório? Como é prestado?
- [ ] Há **taxa mensal** para manter a categoria ou apenas a adesão?

---

## 11. Eventos e Prêmios de Elite

A apresentação menciona:
- **1º Evento do Aniversário**: 10 a 20 de Dezembro de 2026
- **5.300 convidados** (limitado)
- **Prêmios**: Porsche Taycan 4S, casa, BYD Dolphin, carro, cruzeiro, celulares/TVs, vouchers
- **Total**: R$ 4.360.600,00

**Perguntas:**
- [ ] Quais os **critérios de qualificação** para ser convidado ao evento?
- [ ] Como são **distribuídos os prêmios**? (Sorteio? Ranking? Metas?)
- [ ] Os 5.300 convidados — são os **top usuários** por volume/pontos? Qual o corte?
- [ ] Há eventos **regionais** menores além do anual?
- [ ] Os prêmios físicos (carro, casa) são **entregues no evento** ou após?
- [ ] "Termos e Condições das regras constará no site" — pode adiantar as regras principais?

---

## 12. Integração de Apps (Refeição, Shopping, Farmácia, Pet)

- **Modelo**: Apps integrados, taxa fixa 24% (mobilidade), divisão de 0,90% em 9 níveis
- **CashBack Circular**: cada ação gera valor real

**Perguntas:**
- [ ] O cashback de 0,90% nas vendas dos apps é **além** do PLR de 0,9% ou é o mesmo?
- [ ] O percentual de cashback **varia por categoria** (Refeição vs Shopping vs Farmácia vs Pet)?
- [ ] O cashback de compras vai para qual carteira? (Shopping? Refeição? Saque?)
- [ ] Há **parceiros credenciados** específicos por categoria? Como funciona o cadastro?
- [ ] O usuário precisa ter **plano ativo** (Blue 3/Premium 5) para receber cashback de compras?
- [ ] O cashback de compras é **imediato** ou após confirmação do pedido/entrega?
- [ ] Há **limite mensal** de cashback por categoria?
- [ ] Comércios parceiros — como recebem o pagamento? Qual o repasse?

---

## 13. Serviços de Benefícios (Auto, Saúde, Educação)

A apresentação lista:
- **Auto e Moto**: Guincho, Socorro Mecânico, Auxílio Combustível
- **Residencial**: Chaveiro, Encanador, Eletricista Emergencial
- **Saúde 24h**: Telemedicina, Odontologia, Assistência Funeral
- **Educação**: Faculdade EAD, Cursos Profissionalizantes

**Perguntas:**
- [ ] Esses serviços são **incluídos** no plano (Blue 3 / Premium 5) ou são **adicionais** pagos?
- [ ] Qual o **limite de uso** mensal/anual de cada serviço? (Ex: 3 guinchos/ano?)
- [ ] Telemedicina e odontologia — são **rede própria** ou **parceiros**? Qual a abrangência?
- [ ] Faculdade EAD — quais instituições parceiras? Bolsa integral ou parcial?
- [ ] Cursos profissionalizantes — plataforma própria ou parceira? Quantos cursos?
- [ ] Assistência funeral — cobre quantos dependentes? Valor do serviço?
- [ ] Como o usuário **solicita** esses serviços? (App, telefone, WhatsApp?)
- [ ] Há **carência** após adesão para usar os serviços?

---

## 14. Previdência Privada e Seguros

- **Previdência**: R$ 500,00 (Blue 3) → R$ 500,00 (Premium 5, 1ª mensalidade)
- **Seguros**: Vida, Carro, Moto, Celular

**Perguntas:**
- [ ] A previdência privada — a NewMobility **deposita R$ 500/mês** ou é um **valor único**?
- [ ] Qual a **instituição financeira** parceira para a previdência?
- [ ] O usuário pode **resgatar** o valor da previdência? Após quanto tempo?
- [ ] Seguro de vida/celular — coberturas, valores de indenização?
- [ ] Seguro do carro/moto — é **obrigatório** para motoristas ou opcional?
- [ ] "1ª mensalidade da habilitação Residual R$ 1.399,00 será pago pela New Mobility" — isso significa que a empresa paga a 1ª mensalidade de **todos** ou apenas de **Premium 5**?

---

## 15. Fluxo de Pagamentos e Saques

**Perguntas:**
- [ ] **Saque mínimo**: qual o valor mínimo para sacar?
- [ ] **Taxa de saque**: há taxa? Qual o valor?
- [ ] **Prazo de saque**: PIX imediato ou em quantos dias úteis?
- [ ] Há **limite diário/mensal** de saques?
- [ ] Quais carteiras podem ser **sacadas**? (Withdrawal, Gratificação, Mobilidade, Shopping?)
- [ ] **Transferências entre carteiras** — são permitidas? Há taxa?
- [ ] Saldo de **Gratificação** pode ser sacado ou apenas usado no app?
- [ ] Saldo de **Mobilidade** pode ser sacado ou apenas usado para corridas?
- [ ] Há **retenção** para impostos (IR, ISS)?
- [ ] O admin **aprova saques** manualmente ou são automáticos?
- [ ] Em caso de **conta inativa**, o saldo fica disponível por quanto tempo?

---

## 16. Comissões e Repasses

- **Taxa fixa 24%** na mobilidade (sem tarifa dinâmica)
- **0,90%** das vendas dos apps dividido em 9 níveis

**Perguntas:**
- [ ] A taxa de 24% na mobilidade é **paga pelo passageiro** (acrescida) ou **descontada do motorista**?
- [ ] Como os 24% são **divididos internamente**? (Plataforma, PLR, gratificações, custos?)
- [ ] O repasse de 0,90% das vendas — é sobre o **valor total da venda** ou sobre o **lucro**?
- [ ] Comércios parceiros — qual a **taxa cobrada** deles por venda? (Ex: 12%? 15%?)
- [ ] Motoristas e entregadores — recebem **comissão** sobre vendas dos apps na sua rede?
- [ ] Há **bônus de volume** para quem exceder um certo número de indicações?

---

## 17. Regras de Qualificação e Inatividade

**Perguntas:**
- [ ] Para **manter o plano ativo**, o usuário precisa de activity mínima? (Login? Compras? Indicações?)
- [ ] Após **quanto tempo de inatividade** a conta é desativada? (30 dias? 90 dias?)
- [ ] Reativação tem **custo**? Qual?
- [ ] Usuário inativo **perde a rede** (downline) ou apenas **para de ganhar**?
- [ ] Há **regra de compressão** dinâmica? (Se alguém sai, o upline sobe?)
- [ ] O que acontece com o **saldo acumulado** se o usuário for desativado?
- [ ] Há **período de carência** antes da desativação definitiva?

---

## 18. BackOffice — Visão do Usuário

**Perguntas:**
- [ ] Quais **carteiras/saldos** o usuário vê no backoffice? Confirmar todas:
  - [ ] Saldo Saque (Withdrawal)
  - [ ] Saldo Mobilidade
  - [ ] Saldo Shopping
  - [ ] Saldo Refeição (Food)
  - [ ] Saldo Farmácia
  - [ ] Saldo Gratificação
  - [ ] Saldo Livre (Free)
  - [ ] Saldo Pendente (Pending)
  - Há outras?
- [ ] A **árvore de indicações** (hierarquia) — quantos níveis o usuário consegue visualizar?
- [ ] O usuário vê **apenas sua rede direta** (unilevel) ou a **matriz completa** (forçada)?
- [ ] Quais **relatórios** estão disponíveis? (Ganhos, indicações, metas, cashback)
- [ ] Há **simulador de ganhos** integrado? Quais variáveis?
- [ ] O usuário vê seu **pino atual** e o **próximo pino** com requisitos faltantes?
- [ ] Notificações — quais eventos disparam notificação? (Nova indicação, cashback recebido, meta atingida)
- [ ] O usuário pode **exportar** seus dados/relatórios? (PDF, Excel)
- [ ] Há **histórico de transações** completo? Com filtros por período/tipo?

---

## 19. Painel Administrativo — Visão do Admin

**Perguntas:**
- [ ] O admin pode **editar saldos** de qualquer usuário manualmente? Com justificativa obrigatória?
- [ ] O admin pode **ativar/desativar** usuários? Com qual motivo?
- [ ] O admin pode **impersonar** (logar como) um usuário para suporte?
- [ ] Quais **relatórios administrativos** são necessários?
  - [ ] Usuários ativos/inativos
  - [ ] Volume de saques (diário, mensal)
  - [ ] Receita total (taxas, mensalidades)
  - [ ] Distribuição de cashback
  - [ ] Matrizes preenchidas
  - [ ] Gratificações pagas
  - [ ] PLR distribuído
  - Outros?
- [ ] O admin pode **criar eventos, anúncios, FAQ, planos**?
- [ ] O admin pode **ajustar configurações** do sistema? (Percentuais de cashback, metas, valores)
- [ ] Há **auditoria** de ações administrativas? (Log de quem alterou o quê e quando)
- [ ] O admin pode **gerar vouchers** manuais para usuários?
- [ ] Há **níveis de admin**? (Super admin, operador, financeiro, suporte)
- [ ] O admin pode **importar/exportar** usuários em massa? (CSV)
- [ ] Há **aprovação de saques** — fluxo de 2 fatores? (Solicita operador, aprova financeiro)

---

## 20. Funcionalidades Técnicas e Regras de Negócio

**Perguntas:**
- [ ] **Idiomas**: o sistema suporta quais idiomas além de PT-BR?
- [ ] **Moeda**: apenas BRL ou múltiplas moedas?
- [ ] **2FA**: obrigatório para todos ou opcional?
- [ ] **Verificação de identidade** (CPF, selfie, documento) — em qual etapa?
- [ ] **Integração com PIX** — automática (API bancária) ou manual (admin processa)?
- [ ] **Webhooks** — há integração com sistemas externos? (ERP, CRM)
- [ ] **App mobile** — o backoffice é responsivo ou há app nativo?
- [ ] **Notificações push** — há? Quais eventos?
- [ ] **API pública** — parceiros podem integrar? Qual o modelo?
- [ ] **LGPD** — como os dados pessoais são tratados? Direito de exclusão?
- [ ] **Backup** — qual a frequência? Há retenção de quanto tempo?
- [ ] **Limites de indicação** — há limite máximo de indicações diretas por usuário?
- [ ] **Spillover** — quando uma indicação não cabe na matriz, vai para quem? (Upline mais próximo? Primeira vaga livre?)
- [ ] **Reentrada** — após completar a matriz, o usuário reentra em nova matriz?
- [ ] **Breakage** — valores não resgatados (contas inativas) — ficam com a empresa ou são redistribuídos?

---

## 📝 Como Responder

Para cada pergunta, responda:
1. **Sim/Não** ou o **valor exato**
2. **Justificativa** (se aplicável)
3. **Exceções** ou **regras especiais**
4. **Referência** (se houver documento/contrato que detalhe)

> ⚠️ **Importante**: Respostas ambiguas ou "a definir" atrasarão a implementação. Quanto mais preciso, mais fiel o sistema será ao modelo idealizado.

---

## 🎯 Prioridades de Resposta

**Alta prioridade** (bloqueia implementação core):
- Seção 1 (Matrizes) — define toda a lógica de cashback
- Seção 2 (Residual) — define a receita recorrente
- Seção 3 (Upgrade) — define o fluxo crítico
- Seção 4 (PLR) — define a distribuição de lucros
- Seção 5 (Gratificações) — define os bônus
- Seção 15 (Saques) — define o fluxo financeiro
- Seção 17 (Inatividade) — define regras de negócio críticas

**Média prioridade** (pode ser ajustado depois):
- Seção 6 (Plano de Carreira)
- Seção 9-10 (Motoristas e Veículos)
- Seção 11 (Eventos)
- Seção 18-19 (BackOffice e Admin)

**Baixa prioridade** (refinamento):
- Seção 12-14 (Apps e Serviços)
- Seção 16 (Comissões)
- Seção 20 (Técnico)

---

*Documento gerado para alinhamento com o idealista do projeto NewMobility.*
*Após resposta, o sistema multi-nível será implementado conforme especificado.*
