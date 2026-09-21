#!/usr/bin/env python3
"""
NewMobility - Documentacao Completa do Sistema
PDF gerado por Felipe
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem
from reportlab.pdfgen import canvas
import os

OUTPUT = '/home/z/my-project/NewMobility_Documentacao_Completa.pdf'

# Colors
EMERALD = HexColor('#10b981')
DARK = HexColor('#1e293b')
GRAY = HexColor('#64748b')
LIGHT_BG = HexColor('#f0fdf4')
AMBER = HexColor('#f59e0b')
BLUE = HexColor('#3b82f6')
WHITE = white

# Styles
styles = getSampleStyleSheet()
title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=28, textColor=EMERALD, spaceAfter=10, alignment=TA_CENTER, fontName='Helvetica-Bold')
subtitle_style = ParagraphStyle('CustomSubtitle', parent=styles['Normal'], fontSize=14, textColor=GRAY, spaceAfter=20, alignment=TA_CENTER, fontName='Helvetica')
h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=18, textColor=EMERALD, spaceAfter=12, spaceBefore=20, fontName='Helvetica-Bold')
h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=DARK, spaceAfter=8, spaceBefore=14, fontName='Helvetica-Bold')
body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, textColor=DARK, spaceAfter=6, alignment=TA_JUSTIFY, fontName='Helvetica', leading=14)
bullet_style = ParagraphStyle('Bullet', parent=body_style, leftIndent=20, bulletIndent=10)
author_style = ParagraphStyle('Author', parent=styles['Normal'], fontSize=12, textColor=GRAY, alignment=TA_CENTER, fontName='Helvetica-Oblique')
footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=GRAY, alignment=TA_CENTER, fontName='Helvetica')

def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(GRAY)
    canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, f'Pagina {doc.page}')
    canvas.drawString(2*cm, 1.5*cm, 'NewMobility - Documentacao Completa')
    canvas.restoreState()

def make_table(data, col_widths=None):
    if not col_widths:
        col_widths = [17*cm/len(data[0])] * len(data[0])
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), EMERALD),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 1), (-1, -1), DARK),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t

story = []

# ============ COVER PAGE ============
story.append(Spacer(1, 6*cm))
story.append(Paragraph('NewMobility', title_style))
story.append(Paragraph('Documentacao Completa do Sistema', subtitle_style))
story.append(Spacer(1, 2*cm))
story.append(Paragraph('Plataforma Multi-Nivel de CashBack, Mobilidade e Servicos', ParagraphStyle('Tag', parent=styles['Normal'], fontSize=12, textColor=EMERALD, alignment=TA_CENTER, fontName='Helvetica-Bold')))
story.append(Spacer(1, 1*cm))
story.append(Paragraph('Documentacao tecnica completa cobrindo arquitetura, modulos, banco de dados, APIs e fluxos do sistema.', body_style))
story.append(Spacer(1, 3*cm))
story.append(Paragraph('Autor: Felipe', author_style))
story.append(Paragraph('Versao: 1.0 | Setembro 2026', author_style))
story.append(PageBreak())

# ============ 1. VISAO GERAL ============
story.append(Paragraph('1. Visao Geral do Sistema', h1_style))
story.append(Paragraph('O NewMobility e uma plataforma multi-modulo que integra CashBack Multi-Nivel (MMN), mobilidade urbana, marketplace, servicos e aplicativos mobile. O sistema permite que usuarios ganhem dinheiro atraves de indicacoes, matrizes de cashback e plano de carreira, enquanto motoristas, lojistas e clientes utilizam os apps para suas atividades diarias.', body_style))

story.append(Paragraph('1.1 Modulos Principais', h2_style))
modules = [
    ['Modulo', 'Descricao', 'URL'],
    ['Backoffice (Web)', 'Area do usuario com 30 menus: dashboard, cashback, matrizes, carreira, financeiro, etc.', '/'],
    ['Painel Admin', '31 secoes administrativas dentro do backoffice para gestao total do sistema', '/ (aba Admin)'],
    ['App Mobile Cliente', 'App mobile para clientes: saldo, categorias, produtos, carteira, transferencias', '/mobile/*'],
    ['App Motorista', 'App para motoristas: mapa, corridas, ganhos, metas', '/motorista/*'],
    ['App Lojista', 'Painel do lojista: produtos, pedidos, financeiro da loja', '/lojista/*'],
    ['Painel Admin Geral', 'Admin separado do app (nao confundir com o admin do backoffice)', '/admingeral/*'],
]
story.append(make_table(modules, [4*cm, 8*cm, 5*cm]))
story.append(Spacer(1, 10))

# ============ 2. ARQUITETURA ============
story.append(Paragraph('2. Arquitetura do Sistema', h1_style))
story.append(Paragraph('O sistema utiliza Next.js 16 (App Router) com Turbopack, TypeScript, Tailwind CSS 4 e shadcn/ui. O banco de dados usa PostgreSQL (producao) via Prisma ORM. O deploy e feito na LipeHost VPS com PM2.', body_style))

story.append(Paragraph('2.1 Stack Tecnologica', h2_style))
tech = [
    ['Tecnologia', 'Versao', 'Uso'],
    ['Next.js', '16.1.3', 'Framework principal (App Router + Turbopack)'],
    ['TypeScript', '5.x', 'Linguagem (strict mode)'],
    ['Prisma ORM', '6.19.2', 'ORM para PostgreSQL'],
    ['Tailwind CSS', '4.x', 'Estilizacao + design system'],
    ['shadcn/ui', 'New York', 'Componentes UI (Lucide icons)'],
    ['NextAuth.js', '4.24.11', 'Autenticacao'],
    ['Framer Motion', 'latest', 'Animacoes'],
    ['Zustand', 'latest', 'State management (client)'],
    ['TanStack Query', 'latest', 'State management (server)'],
    ['PM2', 'latest', 'Process manager (producao)'],
]
story.append(make_table(tech, [4*cm, 3*cm, 10*cm]))
story.append(Spacer(1, 10))

# ============ 3. BANCO DE DADOS ============
story.append(Paragraph('3. Banco de Dados (54 Modelos)', h1_style))
story.append(Paragraph('O sistema possui 54 modelos no Prisma, organizados em modulos funcionais. Abaixo estao os principais:', body_style))

story.append(Paragraph('3.1 Modelos Principais', h2_style))
db_models = [
    ['Modelo', 'Descricao', 'Registros (seed)'],
    ['User', 'Usuarios do sistema (admin, cliente, motorista, lojista)', '46'],
    ['UserType', 'Tipos de usuario (14 tipos)', '14'],
    ['Plan', 'Planos (Gratuito, Blue 3, Blue 5)', '3'],
    ['MatrixType', 'Tipos de matriz (Entrada, Residual, Vendas)', '3'],
    ['MatrixLevelEarning', 'Percentuais de ganho por nivel de matriz', '21'],
    ['MatrixPosition', 'Posicoes na arvore de matriz', '81'],
    ['CareerPlan', 'PINs de carreira (Safira a Imperial)', '5'],
    ['GoalConfig', 'Metas de motorista/entregador', '4'],
    ['StreakReward', 'Recompensas de sequencia diaria', '3'],
    ['SystemConfig', 'Configuracoes do sistema (80+ params)', '80+'],
    ['Transaction', 'Transacoes financeiras', '24'],
    ['Invoice', 'Faturas', '3'],
    ['Voucher', 'Vouchers e cupons', '5'],
    ['MarketplaceProduct', 'Produtos do marketplace', '26'],
    ['ServiceType', 'Categorias de servicos', '15'],
    ['Event', 'Eventos do calendario', '3'],
    ['FAQ', 'Perguntas frequentes', '6'],
    ['Notification', 'Notificacoes do sistema', '5'],
    ['Ticket', 'Tickets de suporte', '3'],
    ['AuditLog', 'Log de auditoria (todas acoes admin)', 'dinamico'],
]
story.append(make_table(db_models, [4.5*cm, 7.5*cm, 5*cm]))
story.append(PageBreak())

# ============ 4. MATRIZES MMN ============
story.append(Paragraph('4. Matrizes MMN (CashBack Multi-Nivel)', h1_style))
story.append(Paragraph('O sistema possui 3 matrizes de cashback, cada uma com sua propria estrutura de niveis e percentuais de distribuicao. Todas as configuracoes sao editaveis pelo admin.', body_style))

story.append(Paragraph('4.1 Matriz de Entrada (4x5)', h2_style))
entrada = [
    ['Nivel', 'Percentual', 'Descricao'],
    ['1', '5%', 'Indicados diretos (nivel 1)'],
    ['2', '10%', 'Segundo nivel de indicacao'],
    ['3', '10%', 'Terceiro nivel de indicacao'],
    ['4', '5%', 'Quarto nivel de indicacao'],
    ['5', '5%', 'Quinto nivel de indicacao'],
    ['Total', '35%', 'Soma de todos os niveis'],
]
story.append(make_table(entrada, [3*cm, 4*cm, 10*cm]))
story.append(Paragraph('Base de calculo: R$ 999,00 (configuravel pelo admin)', body_style))
story.append(Spacer(1, 10))

story.append(Paragraph('4.2 Matriz Residual (4x7)', h2_style))
residual = [
    ['Nivel', 'Percentual', 'Descricao'],
    ['1', '10%', 'Primeiro nivel residual'],
    ['2', '9%', 'Segundo nivel'],
    ['3', '5%', 'Terceiro nivel'],
    ['4', '5%', 'Quarto nivel'],
    ['5', '4%', 'Quinto nivel'],
    ['6', '3%', 'Sexto nivel'],
    ['7', '2%', 'Setimo nivel'],
    ['Total', '38%', 'Soma de todos os niveis'],
]
story.append(make_table(residual, [3*cm, 4*cm, 10*cm]))
story.append(Paragraph('Base de calculo: R$ 1.399,00 (configuravel pelo admin)', body_style))
story.append(Spacer(1, 10))

story.append(Paragraph('4.3 Matriz de Vendas (4x9)', h2_style))
vendas = [
    ['Nivel', 'Percentual', 'Descricao'],
    ['1-9', '0,10% cada', 'Nove niveis com 0,10% cada'],
    ['Total', '0,90%', 'Soma de todos os 9 niveis'],
]
story.append(make_table(vendas, [3*cm, 4*cm, 10*cm]))
story.append(Paragraph('Base de calculo: R$ 199,90 | Limite de vendas: 1.000 (configuravel)', body_style))
story.append(PageBreak())

# ============ 5. PLANOS ============
story.append(Paragraph('5. Planos e Precos', h1_style))
plans = [
    ['Plano', 'Preco', 'CashBack Entrada', 'CashBack Residual', 'CashBack Vendas'],
    ['Gratuito', 'R$ 0,00', 'Nao', 'Nao', 'Nao'],
    ['Blue 3', 'R$ 999,90', '3 niveis', 'Bloqueado', 'Bloqueado'],
    ['Blue 5 Premium', 'R$ 999,90', '5 niveis', '7 niveis', '9 niveis'],
]
story.append(make_table(plans, [3*cm, 3*cm, 3.5*cm, 3.5*cm, 3.5*cm]))
story.append(Paragraph('Mensalidade: R$ 999,90 (configuravel pelo admin). O CashBack Vendas so e liberado para usuarios sem faturas pendentes.', body_style))
story.append(Spacer(1, 15))

# ============ 6. PLANO DE CARREIRA ============
story.append(Paragraph('6. Plano de Carreira (PINs)', h1_style))
story.append(Paragraph('O plano de carreira e para TODOS os usuarios. Cada PIN e uma graduacao com bonus mensal pago todos os meses ao manter a categoria conquistada.', body_style))
career = [
    ['PIN', 'Icone', 'Pontos Minimos', 'Bonus Saque/mes'],
    ['Safira', '🔵', '100 pts', 'R$ 2.000,00'],
    ['Rubi', '🔴', '250 pts', 'R$ 3.000,00'],
    ['Esmeralda', '🟢', '500 pts', 'R$ 4.000,00'],
    ['Diamante', '💎', '1.000 pts', 'R$ 5.000,00'],
    ['Imperial', '👑', '2.500 pts', 'R$ 6.000,00'],
]
story.append(make_table(career, [3*cm, 2.5*cm, 4*cm, 5.5*cm]))
story.append(PageBreak())

# ============ 7. METAS ============
story.append(Paragraph('7. Metas (Motorista/Entregador)', h1_style))
goals = [
    ['Meta', 'Tipo', 'Objetivo', 'Recompensa', 'Frequencia'],
    ['Meta Diaria Motorista', 'Motorista', '20 viagens/dia', 'R$ 5,00', 'Diaria'],
    ['Meta Mensal Motorista', 'Motorista', '384 viagens/mes', 'R$ 30,00', 'Mensal'],
    ['Meta Diaria Entregador', 'Entregador', '15 entregas/dia', 'R$ 4,00', 'Diaria'],
    ['Meta Mensal Entregador', 'Entregador', '300 entregas/mes', 'R$ 25,00', 'Mensal'],
]
story.append(make_table(goals, [4*cm, 2.5*cm, 3.5*cm, 3*cm, 3*cm]))
story.append(Spacer(1, 15))

# ============ 8. QUALIFICACOES ============
story.append(Paragraph('8. Tipos de Qualificacao (17 opcoes)', h1_style))
quals = [
    ['Codigo', 'Label'],
    ['usuario', 'Usuario'],
    ['motorista', 'Motorista'],
    ['entregador', 'Entregador'],
    ['cliente', 'Cliente'],
    ['lojista', 'Lojista'],
    ['mototaxista', 'Mototaxista'],
    ['motofretista', 'Motofretista'],
    ['motorista_app', 'Motorista de App'],
    ['taxista', 'Taxista'],
    ['caminhoneiro', 'Caminhoneiro'],
    ['parceiro', 'Parceiro'],
    ['empresa', 'Empresa'],
    ['afiliado', 'Afiliado'],
    ['administrador', 'Administrador'],
    ['gratuito', 'Gratuito'],
    ['inativo', 'Inativo'],
    ['outros', 'Outros'],
]
# Split into two columns for space
half = len(quals) // 2 + 1
left = quals[:half]
right = quals[half:]
while len(right) < len(left):
    right.append(['', ''])
combined = [left[i] + right[i] for i in range(len(left))]
story.append(make_table(combined, [4*cm, 4.5*cm, 4*cm, 4.5*cm]))
story.append(PageBreak())

# ============ 9. CONFIGURACOES DO SISTEMA ============
story.append(Paragraph('9. Configuracoes do Sistema (80+ params)', h1_style))
story.append(Paragraph('O admin pode editar TODOS os parametros do sistema pela aba "Configuracoes do Sistema" no painel admin. As configuracoes estao organizadas em 12 categorias:', body_style))
configs = [
    ['Categoria', 'Quantidade', 'Exemplos'],
    ['matrizes', '22', '% por nivel, base, largura, limite de vendas'],
    ['cashback', '4', '% entrada, % residual, % vendas, % direto'],
    ['planos', '16', 'nomes, precos, niveis de cashback, mensalidade'],
    ['saques', '6', 'min, max, taxa, tempo processamento, max diarios'],
    ['pontos', '5', 'por indicacao, por compra, por cashback, login, estrela'],
    ['vouchers', '2', 'boas-vindas, cadastro'],
    ['metas', '6', 'corridas/dia, corridas/mes, bonus diario/mensal'],
    ['geral', '6', 'manutencao, registro, senha, timeout, tentativas'],
    ['talkmobi', '3', 'preco minimo, max planos, auto-ativacao'],
    ['telemedicina', '3', 'preco, validade, auto-ativacao'],
    ['marketplace', '4', 'max fotos, comissao, min/max preco'],
    ['career', '3', 'max claims/mes, expiracao pontos, frequencia bonus'],
]
story.append(make_table(configs, [3.5*cm, 2.5*cm, 11*cm]))
story.append(PageBreak())

# ============ 10. PAINEL ADMIN ============
story.append(Paragraph('10. Painel Admin (31 Secoes)', h1_style))
admin_sections = [
    ['Secao', 'Funcao'],
    ['Dashboard', 'Estatisticas: usuarios, receita, cashback, planos'],
    ['Usuarios', 'CRUD de usuarios + criar, editar, excluir, resetar senha'],
    ['Tipos de Usuario', 'CRUD de tipos (14 tipos) + permissoes mobile'],
    ['Financeiro', 'Transacoes, saques, cashback, visao consolidada'],
    ['Saques Asaas', 'Aprovacao de saques via Asaas (PIX/TED)'],
    ['Planos & Precos', 'CRUD de planos (Blue3, Blue5)'],
    ['Gratificacoes', 'Metas configuraveis por tipo de usuario'],
    ['Tipos de Servico', 'CRUD de categorias de servicos (15 tipos)'],
    ['Vouchers', 'CRUD de vouchers + cupons'],
    ['Jogos & Apostas', 'Gestao de apostas + game config'],
    ['Matrizes MMN', 'Visualizacao + limite de vendas + Modo Avancado (editor inline)'],
    ['Tickets de Suporte', 'Gestao de tickets + respostas'],
    ['Aprovacao KYC', 'Aprovar/rejeitar documentos KYC'],
    ['Planos TalkMobi', 'CRUD de planos de celular'],
    ['Assinaturas TalkMobi', 'Aprovar/rejeitar pedidos de assinatura'],
    ['Telemedicina', 'Aprovar/rejeitar pedidos de ativacao'],
    ['Desafios', 'CRUD de desafios semanais/mensais'],
    ['Anuncios', 'CRUD de anuncios + banners'],
    ['Relatorios', 'Relatorios admin + exportacao'],
    ['Logs de Auditoria', 'Historico de acoes administrativas'],
    ['Permissoes', 'Permissoes por role + custom roles'],
    ['Conquistas', 'CRUD de achievements + variaveis'],
    ['Plano de Carreira', 'CRUD de PINs (Safira a Imperial)'],
    ['Recompensas de Sequencia', 'CRUD de streak rewards'],
    ['Eventos', 'CRUD de eventos + inscricoes'],
    ['Perguntas Frequentes', 'CRUD de FAQ'],
    ['Config Cashback', '% de cashback das 3 matrizes + config de pontos'],
    ['Conteudo e Textos', 'Editar textos/labels do sistema (35+ textos)'],
    ['Configuracoes do Sistema', 'Editar TUDO: 80+ params em 12 categorias'],
    ['Asaas', 'Configuracao de integracao Asaas'],
    ['Configuracoes', 'Config gerais (modo manutencao, registro, logo)'],
]
story.append(make_table(admin_sections, [5*cm, 12*cm]))
story.append(PageBreak())

# ============ 11. APPS MOBILE ============
story.append(Paragraph('11. Apps Mobile', h1_style))

story.append(Paragraph('11.1 App Mobile Cliente (/mobile/*)', h2_style))
mobile_pages = [
    ['Pagina', 'Funcao'],
    ['/mobile/login', 'Login do app cliente'],
    ['/mobile/inicio', 'Home: saldo, categorias, banners, produtos'],
    ['/mobile/carteira', 'Carteira completa: saldos + transferencias'],
    ['/mobile/enviar', 'Transferir entre carteiras'],
    ['/mobile/depositar', 'Depositar via PIX'],
    ['/mobile/receber', 'Mostrar chave PIX'],
    ['/mobile/sacar', 'Solicitar saque via PIX'],
    ['/mobile/pedidos', 'Historico de pedidos'],
    ['/mobile/procurar', 'Buscar produtos'],
    ['/mobile/perfil', 'Perfil + configuracoes'],
    ['/mobile/notificacoes', 'Lista de notificacoes'],
    ['/mobile/shopping', 'Categoria shopping'],
    ['/mobile/alimentacao', 'Categoria alimentacao'],
    ['/mobile/mercado', 'Categoria mercado'],
    ['/mobile/medidrop', 'Categoria farmacia'],
    ['/mobile/mobilidade', 'Categoria mobilidade (corridas)'],
    ['/mobile/reserva', 'Categoria reservas'],
    ['/mobile/assistencia', 'Categoria assistencia tecnica'],
]
story.append(make_table(mobile_pages, [5*cm, 12*cm]))
story.append(Spacer(1, 10))

story.append(Paragraph('11.2 App Motorista (/motorista/*)', h2_style))
mot_pages = [
    ['Pagina', 'Funcao'],
    ['/motorista/login', 'Login do motorista'],
    ['/motorista/inicio', 'Mapa + ganhos + corridas'],
    ['/motorista/carteira', 'Carteira do motorista'],
    ['/motorista/corridas', 'Historico de corridas'],
    ['/motorista/mais', 'Menu adicional'],
]
story.append(make_table(mot_pages, [5*cm, 12*cm]))
story.append(Spacer(1, 10))

story.append(Paragraph('11.3 App Lojista (/lojista/*)', h2_style))
lojista_pages = [
    ['Pagina', 'Funcao'],
    ['/lojista/login', 'Login do lojista'],
    ['/lojista/inicio', 'Dashboard da loja'],
    ['/lojista/produtos', 'Gestao de produtos (ate 15 fotos)'],
    ['/lojista/pedidos', 'Gestao de pedidos'],
    ['/lojista/financeiro', 'Financeiro da loja'],
    ['/lojista/mais', 'Menu adicional'],
]
story.append(make_table(lojista_pages, [5*cm, 12*cm]))
story.append(PageBreak())

# ============ 12. FLUXO DE LOGIN ============
story.append(Paragraph('12. Fluxo de Login por Aplicacao', h1_style))
login_flow = [
    ['Pagina de Login', 'Para onde vai apos login'],
    ['/ (principal)', 'Fica em / (backoffice web - admin ou usuario)'],
    ['/mobile/login', 'Vai para /mobile/inicio (app mobile)'],
    ['/admingeral/login', 'Vai para /admingeral/inicio (painel admin geral)'],
    ['/motorista/login', 'Vai para /motorista/inicio (app motorista)'],
    ['/lojista/login', 'Vai para /lojista/inicio (app lojista)'],
]
story.append(make_table(login_flow, [6*cm, 11*cm]))
story.append(Spacer(1, 15))

# ============ 13. CREDENCIAIS DEMO ============
story.append(Paragraph('13. Credenciais de Demonstracao', h1_style))
creds = [
    ['Tipo', 'Email', 'Senha'],
    ['Admin', 'admin@newmobility.com', 'admin123'],
    ['Cliente', 'cliente@newmobility.com', '123456'],
    ['Motorista', 'motorista@newmobility.com', '123456'],
    ['Lojista', 'lojista@newmobility.com', '123456'],
]
story.append(make_table(creds, [3*cm, 8*cm, 6*cm]))
story.append(Spacer(1, 20))

# ============ 14. DEPLOY ============
story.append(Paragraph('14. Deploy (LipeHost VPS)', h1_style))
story.append(Paragraph('O deploy e feito na LipeHost VPS com PM2. O processo:', body_style))
deploy_steps = [
    '1. git pull origin main',
    '2. npm install (ou bun install)',
    '3. npx prisma generate',
    '4. npx prisma db push (sync schema)',
    '5. npm run seed (popular dados)',
    '6. npm run build',
    '7. pm2 restart newmobility (ou pm2 start)',
]
for step in deploy_steps:
    story.append(Paragraph(step, bullet_style))
story.append(Spacer(1, 15))

# ============ 15. EDITOR AVANCADO DE MATRIZES ============
story.append(Paragraph('15. Editor Avancado de Matrizes (Modo Planilha)', h1_style))
story.append(Paragraph('Dentro da aba "Matrizes MMN" do admin, existe um "Modo Avancado" que permite editar diretamente os tipos de matriz e as posicoes na arvore de indicacoes, como uma planilha inline.', body_style))
story.append(Paragraph('Recursos do Modo Avancado:', h2_style))
advanced = [
    'Editar percentuais de ganho por nivel de cada matriz',
    'Adicionar/remover niveis de uma matriz',
    'Ver e editar posicoes dentro da arvore de matriz',
    'Filtrar por usuario, matriz, nivel, status',
    'Confirmacao antes de salvar (impacto financeiro)',
    'Log de auditoria para toda alteracao',
]
for item in advanced:
    story.append(Paragraph(item, bullet_style))
story.append(PageBreak())

# ============ 16. RECOMPENSAS DE SEQUENCIA ============
story.append(Paragraph('16. Recompensas de Sequencia (Streak)', h1_style))
streak = [
    ['Dias Consecutivos', 'Tipo de Recompensa', 'Valor'],
    ['7 dias', 'Pontos', '50 pontos'],
    ['14 dias', 'CashBack', 'R$ 5,00'],
    ['30 dias', 'CashBack', 'R$ 20,00'],
]
story.append(make_table(streak, [5*cm, 5*cm, 7*cm]))
story.append(Spacer(1, 15))

# ============ 17. TIPOS DE SERVICO ============
story.append(Paragraph('17. Tipos de Servico (15 categorias)', h1_style))
services = [
    ['Categoria'],
    ['Eletricista'], ['Encanador'], ['Pedreiro'], ['Pintor'],
    ['Jardinagem'], ['Limpeza'], ['Refrigeracao / Ar Condicionado'],
    ['Marcenaria'], ['Dedetizacao'], ['Fretes e Mudancas'],
    ['Borracheiro'], ['Mecanico'], ['Vidraceiro'],
    ['Telhadista'], ['Outros'],
]
story.append(make_table(services, [17*cm]))
story.append(PageBreak())

# ============ 18. LOG DE AUDITORIA ============
story.append(Paragraph('18. Log de Auditoria', h1_style))
story.append(Paragraph('Todas as alteracoes feitas pelo admin sao registradas no AuditLog, incluindo:', body_style))
audit_items = [
    'Configuracoes do sistema (create/update/delete)',
    'Tipos de matriz (update/delete)',
    'Posicoes de matriz (update/delete)',
    'Limite de vendas da matriz',
    'Aprovacao/rejeicao de KYC',
    'Aprovacao de saques',
    'Edicao de usuarios',
    'Reset de senha',
]
for item in audit_items:
    story.append(Paragraph(item, bullet_style))
story.append(Spacer(1, 15))

# ============ 19. API ROUTES ============
story.append(Paragraph('19. API Routes (100+ endpoints)', h1_style))
story.append(Paragraph('O sistema possui mais de 100 endpoints de API, organizados por modulo:', body_style))
api_routes = [
    ['Modulo', 'Endpoints', 'Exemplos'],
    ['Auth', '5', '/api/auth/login, /api/auth/register'],
    ['Admin', '40+', '/api/admin/users, /api/admin/system-settings'],
    ['User', '8', '/api/user/profile, /api/user/profile/image'],
    ['Billing', '5', '/api/billing, /api/billing/pay/[id]'],
    ['KYC', '2', '/api/kyc, /api/kyc/[id]'],
    ['Cashback', '4', '/api/cashback, /api/cashback/entrada'],
    ['Career', '2', '/api/career, /api/career/claim'],
    ['Gratifications', '3', '/api/gratifications, /api/gratifications/claim'],
    ['Marketplace', '6', '/api/marketplace/products, /api/marketplace/orders'],
    ['Mobile', '2', '/api/mobile/me, /api/mobile/home'],
    ['Financial', '5', '/api/financial/balances, /api/financial/withdraw'],
    ['Content', '2', '/api/content-texts, /api/admin/content-texts'],
    ['Matrix Config', '3', '/api/admin/matrix-config, /api/admin/matrix-positions'],
]
story.append(make_table(api_routes, [3.5*cm, 2.5*cm, 11*cm]))
story.append(PageBreak())

# ============ 20. CONCLUSAO ============
story.append(Paragraph('20. Conclusao', h1_style))
story.append(Paragraph('O NewMobility e um sistema completo e modular que integra CashBack Multi-Nivel, mobilidade urbana, marketplace, servicos e aplicativos mobile. Com 54 modelos de banco de dados, mais de 100 endpoints de API, 30 menus no backoffice do usuario e 31 secoes no painel admin, o sistema oferece controle total sobre todas as configuracoes sem necessidade de alteracao de codigo.', body_style))
story.append(Spacer(1, 10))
story.append(Paragraph('O admin pode editar absolutamente tudo: precos de planos, percentuais de matrizes, valores de carreira, metas, saques, pontos, vouchers, textos do sistema e muito mais - tudo pela aba "Configuracoes do Sistema" com 80+ parametros em 12 categorias, incluindo log de auditoria para todas as alteracoes.', body_style))
story.append(Spacer(1, 20))
story.append(Paragraph('Documentacao criada por Felipe', author_style))
story.append(Paragraph('Setembro 2026', author_style))

# Build PDF
doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2.5*cm,
    title='NewMobility - Documentacao Completa',
    author='Felipe',
    subject='Documentacao tecnica completa do sistema NewMobility',
    creator='Felipe')
doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=add_page_number)
print(f'PDF gerado: {OUTPUT}')
print(f'Tamanho: {os.path.getsize(OUTPUT) / 1024:.1f} KB')
