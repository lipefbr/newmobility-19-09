import { db } from '@/lib/db'
import { prisma } from '@/lib/db'
import { hashPassword, generateReferralCode, success, error, sanitizeUser } from '@/lib/api-utils'
import { generateVoucherForUser } from '@/lib/voucher'
import { QUALIFICATION_OPTIONS, LEGACY_QUALIFICATION_OPTIONS } from '@/lib/qualifications'

function generateId(): string {
  // Generate a cuid-like ID
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  const random2 = Math.random().toString(36).substring(2, 10)
  return `c${timestamp}${random}${random2}`
}

// Matrix structural width — first 4 paying referrals go to level 1 (direct table).
// When level 1 is full (4/4), overflow is placed via BFS in the downline.
// Per client spec (Índice.docx §1.1): "Matriz 4x5 (4 diretos e 5 de profundidade)"
//
// Tarefa 1 (19/09) — Spillover FIFO estrito:
// - Cada posição trava em NO MÁXIMO 4 indicados diretos (cap = MATRIX_WIDTH).
// - Excedentes fazem spillover BFS respeitando ordem de entrada (FIFO):
//   o filho registrado PRIMEIRO é visitado primeiro na busca.
// - "Indicação direta" (User.referredById) é diferente de "posição na matriz"
//   (MatrixPosition.parentId) — uma pessoa pode ter 10 indicados diretos
//   mas só 4 ficam no nível 1 dela na matriz; os outros 6 caem em spillover.
const MATRIX_WIDTH = 4

// Default depth per matrix type (matches MatrixType.depth in the DB).
const MATRIX_DEPTH: Record<string, number> = {
  entrada: 5,
  residual: 7,
  vendas: 9,
}

/**
 * Find the next available parent position in a matrix tree using BFS FIFO.
 *
 * Algoritmo (Tarefa 1 — 19/09):
 * 1. Inicia BFS pela posição raiz (referrer).
 * 2. Para cada posição visitada, conta os filhos diretos (parentId = current).
 * 3. Se childCount < MATRIX_WIDTH (4): há espaço — coloca o novo usuário aqui,
 *    na posição = childCount (slot 0, 1, 2, 3 em ordem de chegada).
 * 4. Se childCount >= 4: posição cheia — enfileira os filhos para continuar BFS.
 * 5. Filhos são ordenados por createdAt ASC (FIFO — primeiro registrado é
 *    visitado primeiro). Isso garante que o spillover respeita a ordem de entrada.
 * 6. Se a sub-árvore inteira (até maxDepth) estiver cheia, retorna null.
 *
 * Retorna null se não houver espaço na sub-árvore.
 */
async function findSpilloverPosition(
  rootPositionId: string,
  matrixType: string,
  width: number
): Promise<{ parentId: string; level: number; position: number } | null> {
  const maxDepth = MATRIX_DEPTH[matrixType] ?? 5
  const queue: Array<{ id: string; level: number }> = [{ id: rootPositionId, level: 0 }]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current.id)) continue
    visited.add(current.id)

    // Stop searching past the max depth — positions beyond this level
    // can't legally host children in the matrix.
    if (current.level >= maxDepth) continue

    // Count this position's direct children in the matrix.
    const childCount = await db.count(
      'MatrixPosition',
      '"parentId" = $1 AND "matrixType" = $2',
      [current.id, matrixType]
    )

    if (childCount < width) {
      // This position has room — place the new user here.
      // Tarefa 1: posição = childCount (slot 0, 1, 2, 3 em ordem FIFO).
      return {
        parentId: current.id,
        level: current.level + 1,
        position: childCount,
      }
    }

    // No room at this position — enqueue its children to continue BFS.
    const children = await db.find(
      'MatrixPosition',
      '"parentId" = $1 AND "matrixType" = $2',
      [current.id, matrixType]
    ) as any[]

    // Tarefa 1 — ordenar por createdAt ASC (FIFO: primeiro registrado é visitado primeiro).
    children.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    for (const child of children) {
      queue.push({ id: child.id, level: current.level + 1 })
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      cpf,
      password,
      referralCode,
      plan,
      // New personal data fields
      qualification,
      sponsorId,
      birthDate,
      rg,
      maritalStatus,
      gender,
      education,
      zipCode,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
    } = body

    // --- Validation ---
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return error('Nome é obrigatório e deve ter pelo menos 2 caracteres')
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return error('Email válido é obrigatório')
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return error('Senha é obrigatória e deve ter pelo menos 6 caracteres')
    }

    // Qualification is REQUIRED at registration.
    // Valid options come from the shared QUALIFICATION_OPTIONS list in
    // `@/lib/qualifications` (10 business-relevant codes: motorista,
    // entregador, cliente, lojista, mototaxista, motofretista, motorista_app,
    // taxista, caminhoneiro, outros). Legacy codes (passageiro / passageiro_60
    // / passageiro_pcd / comercio) are also accepted for backward compat
    // with any pre-existing deployment that still uses them.
    const validQualifications: string[] = [
      ...QUALIFICATION_OPTIONS.map((o) => o.value),
      ...LEGACY_QUALIFICATION_OPTIONS.map((o) => o.value),
    ]
    if (!qualification || typeof qualification !== 'string' || !validQualifications.includes(qualification)) {
      return error('Qualificação é obrigatória e deve ser uma das opções válidas')
    }

    // Check unique email
    console.log('[Register] Checking email uniqueness:', email)
    let existingEmail: any
    try {
      existingEmail = await db.findOne('User', '"email" = $1', [email])
    } catch (dbErr) {
      console.error('[Register] Error checking email uniqueness:', dbErr)
      return error('Erro ao verificar email. Tente novamente.', 500)
    }
    if (existingEmail) {
      return error('Email já cadastrado', 409)
    }

    // Check unique CPF if provided
    if (cpf) {
      // Strip mask: keep only digits for consistent comparison
      const cpfDigits = String(cpf).replace(/\D/g, '')
      const cpfFormatted = cpfDigits.length === 11
        ? `${cpfDigits.slice(0,3)}.${cpfDigits.slice(3,6)}.${cpfDigits.slice(6,9)}-${cpfDigits.slice(9)}`
        : cpf
      console.log('[Register] Checking CPF uniqueness:', cpfFormatted)
      try {
        // Try both formatted and digits-only lookup for robustness
        const existingCpfFormatted = await db.findOne('User', '"cpf" = $1', [cpfFormatted])
        const existingCpfDigits = cpfDigits !== cpfFormatted
          ? await db.findOne('User', '"cpf" = $1', [cpfDigits])
          : null
        if (existingCpfFormatted || existingCpfDigits) {
          return error('CPF já cadastrado', 409)
        }
        // Use formatted CPF for storage
        body.cpf = cpfFormatted
      } catch (dbErr) {
        console.error('[Register] Error checking CPF uniqueness:', dbErr)
        // Don't block registration if CPF check fails - proceed with caution
        console.warn('[Register] Proceeding without CPF uniqueness verification')
      }
    }

    // Find referrer if referral code provided
    // Item 13 (sponsor validation): all non-admin users MUST have a valid
    // sponsor (referredById) at registration time. The admin seed user is the
    // only one exempt from this rule. Here we resolve the referrer from the
    // provided referralCode and reject the registration with HTTP 400 if the
    // code is missing or does not match any existing User.
    let referrer = null
    if (referralCode) {
      console.log('[Register] Looking up referrer with code:', referralCode)
      try {
        referrer = await db.findOne('User', '"referralCode" = $1', [referralCode])
        if (!referrer) {
          // Item 13: invalid sponsor code -> block registration (was a warning before).
          return error('Patrocinador é obrigatório. Informe um código de indicação válido.', 400)
        }
      } catch (dbErr) {
        console.error('[Register] Error looking up referrer:', dbErr)
        return error('Não foi possível verificar o código de indicação. Tente novamente.', 500)
      }
    } else {
      // Item 13: no referralCode provided at all -> block registration.
      // Only the admin seed (created via prisma/seed.ts) is allowed to have
      // no sponsor. Self-registration through this endpoint always requires one.
      return error('Patrocinador é obrigatório. Informe o código de indicação de quem convidou você.', 400)
    }

    const hashedPassword = hashPassword(password)
    let userReferralCode = generateReferralCode(name)

    // Ensure unique referral code
    try {
      let codeExists = await db.findOne('User', '"referralCode" = $1', [userReferralCode])
      while (codeExists) {
        userReferralCode = generateReferralCode(name)
        codeExists = await db.findOne('User', '"referralCode" = $1', [userReferralCode])
      }
    } catch (dbErr) {
      console.error('[Register] Error ensuring unique referral code:', dbErr)
      // Non-critical, proceed with the current code
    }

    const userPlan = plan || 'free'
    const isActive = userPlan !== 'free'
    const userId = generateId()

    // --- Create user (CRITICAL) ---
    console.log('[Register] Creating user:', email)
    let user: any
    try {
      const now = new Date().toISOString()

      // Build optional personal data fields - only include if provided and non-empty
      const personalData: Record<string, any> = {}
      if (sponsorId && typeof sponsorId === 'string') personalData.sponsorId = sponsorId
      if (birthDate && typeof birthDate === 'string') {
        const parsed = new Date(birthDate)
        if (!isNaN(parsed.getTime())) {
          personalData.birthDate = parsed
        }
      }
      if (rg && typeof rg === 'string') personalData.rg = rg
      if (maritalStatus && typeof maritalStatus === 'string') personalData.maritalStatus = maritalStatus
      if (gender && typeof gender === 'string') personalData.gender = gender
      if (education && typeof education === 'string') personalData.education = education
      if (zipCode && typeof zipCode === 'string') personalData.zipCode = zipCode
      if (emergencyName && typeof emergencyName === 'string') personalData.emergencyName = emergencyName
      if (emergencyPhone && typeof emergencyPhone === 'string') personalData.emergencyPhone = emergencyPhone
      if (emergencyRelation && typeof emergencyRelation === 'string') personalData.emergencyRelation = emergencyRelation

      user = await db.insert('User', {
        id: userId,
        name,
        email,
        username: email.split('@')[0],
        phone: phone || null,
        cpf: body.cpf || cpf || null,
        password: hashedPassword,
        referralCode: userReferralCode,
        referredById: referrer?.id || null,
        plan: userPlan,
        isActive,
        qualification,
        ...personalData,
        createdAt: now,
        updatedAt: now,
      })
      console.log('[Register] User created successfully:', userId)
      console.log('[Register] Saved qualification:', qualification)
    } catch (dbErr) {
      console.error('[Register] CRITICAL: Error creating user:', dbErr)
      return error('Erro ao criar conta. Tente novamente.', 500)
    }

    // --- Create matrix positions (OPTIONAL - failures should NOT block registration) ---
    //
    // Spillover rules (per product spec):
    //   • Each matrix is 5-wide (width = 5) with depths 5/7/9 for entrada/residual/vendas.
    //   • The first 5 referrals of a referrer go directly under the referrer (level 1).
    //   • Once the referrer's level-1 row is full (5/5), subsequent referrals are placed
    //     via BFS in the referrer's downline (spillover): leftmost available slot under
    //     the referrer's level-1 children, then their children, etc.
    //   • The Entrada matrix is for PAYING members only — free users are skipped
    //     (they still get placed in the residual and vendas matrices).

    const isPayingMember = userPlan !== 'free'

    // Entrada matrix (PAYING MEMBERS ONLY)
    try {
      if (referrer && isPayingMember) {
        console.log('[Register] Creating entrada matrix position for user:', userId)
        const referrerPosition = await db.findOne(
          'MatrixPosition',
          '"userId" = $1 AND "matrixType" = $2',
          [referrer.id, 'entrada']
        )

        if (referrerPosition) {
          const existingPositions = await db.count(
            'MatrixPosition',
            '"parentId" = $1 AND "matrixType" = $2',
            [referrerPosition.id, 'entrada']
          )

          let placement: { parentId: string; level: number; position: number }
          if (existingPositions < MATRIX_WIDTH) {
            // Referrer has room — place directly under referrer.
            // Right-to-left fill: newest referral goes to rightmost empty slot.
            placement = {
              parentId: referrerPosition.id,
              level: referrerPosition.level + 1,
              position: existingPositions,
            }
          } else {
            // Referrer's level-1 row is full — spillover via BFS.
            const spillover = await findSpilloverPosition(
              referrerPosition.id,
              'entrada',
              MATRIX_WIDTH
            )
            if (spillover) {
              placement = spillover
              console.log('[Register] Entrada spillover: placed at parent', placement.parentId, 'level', placement.level)
            } else {
              // Entire downline is full — fall back to placing under referrer.
              placement = {
                parentId: referrerPosition.id,
                level: referrerPosition.level + 1,
                position: existingPositions,
              }
              console.warn('[Register] Entrada matrix full — placing under referrer as fallback')
            }
          }

          await db.insert('MatrixPosition', {
            id: generateId(),
            userId: user.id,
            matrixType: 'entrada',
            parentId: placement.parentId,
            level: placement.level,
            position: placement.position,
            isFilled: true,
            createdAt: new Date().toISOString(),
          })

          // Update user entrada level (optional - don't fail if column doesn't exist)
          try {
            await db.update('User', '"id" = $1', { entradaLevel: placement.level }, [user.id])
          } catch (updateErr) {
            console.warn('[Register] Warning: Could not update entradaLevel:', updateErr)
          }
        } else {
          console.warn('[Register] Referrer has no entrada matrix position, creating top-level position')
          await db.insert('MatrixPosition', {
            id: generateId(),
            userId: user.id,
            matrixType: 'entrada',
            level: 0,
            position: 0,
            isFilled: true,
            createdAt: new Date().toISOString(),
          })
        }
      } else if (!referrer) {
        // No referrer - top-level position
        await db.insert('MatrixPosition', {
          id: generateId(),
          userId: user.id,
          matrixType: 'entrada',
          level: 0,
          position: 0,
          isFilled: true,
          createdAt: new Date().toISOString(),
        })
      } else {
        // Free member with a referrer — skip entrada matrix entirely.
        console.log('[Register] Skipping entrada matrix for free member:', userId)
      }
      console.log('[Register] Entrada matrix position handled')
    } catch (matrixErr) {
      console.error('[Register] NON-CRITICAL: Error creating entrada matrix position:', matrixErr)
      // Continue - matrix position is optional
    }

    // Residual matrix (all members)
    try {
      if (referrer) {
        console.log('[Register] Creating residual matrix position for user:', userId)
        const referrerResidual = await db.findOne(
          'MatrixPosition',
          '"userId" = $1 AND "matrixType" = $2',
          [referrer.id, 'residual']
        )

        if (referrerResidual) {
          const existingResidualPositions = await db.count(
            'MatrixPosition',
            '"parentId" = $1 AND "matrixType" = $2',
            [referrerResidual.id, 'residual']
          )

          let residualPlacement: { parentId: string; level: number; position: number }
          if (existingResidualPositions < MATRIX_WIDTH) {
            // Right-to-left fill.
            residualPlacement = {
              parentId: referrerResidual.id,
              level: referrerResidual.level + 1,
              position: existingResidualPositions,
            }
          } else {
            const spillover = await findSpilloverPosition(
              referrerResidual.id,
              'residual',
              MATRIX_WIDTH
            )
            if (spillover) {
              residualPlacement = spillover
              console.log('[Register] Residual spillover: placed at parent', residualPlacement.parentId, 'level', residualPlacement.level)
            } else {
              residualPlacement = {
                parentId: referrerResidual.id,
                level: referrerResidual.level + 1,
                position: existingResidualPositions,
              }
              console.warn('[Register] Residual matrix full — placing under referrer as fallback')
            }
          }

          await db.insert('MatrixPosition', {
            id: generateId(),
            userId: user.id,
            matrixType: 'residual',
            parentId: residualPlacement.parentId,
            level: residualPlacement.level,
            position: residualPlacement.position,
            isFilled: true,
            createdAt: new Date().toISOString(),
          })

          try {
            await db.update('User', '"id" = $1', { residualLevel: residualPlacement.level }, [user.id])
          } catch (updateErr) {
            console.warn('[Register] Warning: Could not update residualLevel:', updateErr)
          }
        } else {
          console.warn('[Register] Referrer has no residual matrix position, creating top-level position')
          await db.insert('MatrixPosition', {
            id: generateId(),
            userId: user.id,
            matrixType: 'residual',
            level: 0,
            position: 0,
            isFilled: true,
            createdAt: new Date().toISOString(),
          })
        }
      } else {
        await db.insert('MatrixPosition', {
          id: generateId(),
          userId: user.id,
          matrixType: 'residual',
          level: 0,
          position: 0,
          isFilled: true,
          createdAt: new Date().toISOString(),
        })
      }
      console.log('[Register] Residual matrix position created')
    } catch (matrixErr) {
      console.error('[Register] NON-CRITICAL: Error creating residual matrix position:', matrixErr)
      // Continue - matrix position is optional
    }

    // Vendas matrix (all members)
    try {
      if (referrer) {
        console.log('[Register] Creating vendas matrix position for user:', userId)
        const referrerVendas = await db.findOne(
          'MatrixPosition',
          '"userId" = $1 AND "matrixType" = $2',
          [referrer.id, 'vendas']
        )

        if (referrerVendas) {
          const existingVendasPositions = await db.count(
            'MatrixPosition',
            '"parentId" = $1 AND "matrixType" = $2',
            [referrerVendas.id, 'vendas']
          )

          let vendasPlacement: { parentId: string; level: number; position: number }
          if (existingVendasPositions < MATRIX_WIDTH) {
            // Right-to-left fill.
            vendasPlacement = {
              parentId: referrerVendas.id,
              level: referrerVendas.level + 1,
              position: existingVendasPositions,
            }
          } else {
            const spillover = await findSpilloverPosition(
              referrerVendas.id,
              'vendas',
              MATRIX_WIDTH
            )
            if (spillover) {
              vendasPlacement = spillover
              console.log('[Register] Vendas spillover: placed at parent', vendasPlacement.parentId, 'level', vendasPlacement.level)
            } else {
              vendasPlacement = {
                parentId: referrerVendas.id,
                level: referrerVendas.level + 1,
                position: existingVendasPositions,
              }
              console.warn('[Register] Vendas matrix full — placing under referrer as fallback')
            }
          }

          await db.insert('MatrixPosition', {
            id: generateId(),
            userId: user.id,
            matrixType: 'vendas',
            parentId: vendasPlacement.parentId,
            level: vendasPlacement.level,
            position: vendasPlacement.position,
            isFilled: true,
            createdAt: new Date().toISOString(),
          })

          try {
            await db.update('User', '"id" = $1', { vendasLevel: vendasPlacement.level }, [user.id])
          } catch (updateErr) {
            console.warn('[Register] Warning: Could not update vendasLevel:', updateErr)
          }
        } else {
          console.warn('[Register] Referrer has no vendas matrix position, creating top-level position')
          await db.insert('MatrixPosition', {
            id: generateId(),
            userId: user.id,
            matrixType: 'vendas',
            level: 0,
            position: 0,
            isFilled: true,
            createdAt: new Date().toISOString(),
          })
        }
      } else {
        await db.insert('MatrixPosition', {
          id: generateId(),
          userId: user.id,
          matrixType: 'vendas',
          level: 0,
          position: 0,
          isFilled: true,
          createdAt: new Date().toISOString(),
        })
      }
      console.log('[Register] Vendas matrix position created')
    } catch (matrixErr) {
      console.error('[Register] NON-CRITICAL: Error creating vendas matrix position:', matrixErr)
      // Continue - matrix position is optional
    }

    // --- Create R$30 welcome voucher ( mobility-only, non-withdrawable) ---
    // Per client spec (Índice.docx §7): "AO PAGAR O SISTEMA LIBERA AUTOMATICO UM VOUCHER DE R$ 30,00
    //   para uso no aplicativo de mobilidade para novos usuários, todos usuários tem este primeiro voucher de graça"
    // Per §7: "SOMENTE PARA USO - NÃO PODE SER SACADO" — voucher credits only the mobility wallet.
    try {
      const voucherCode = `BEMVINDO${userReferralCode.slice(-6).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1-year validity (client says "NÃO TEM VALIDADE" but DB requires a date)
      await db.insert('Voucher', {
        id: generateId(),
        code: voucherCode,
        userId: user.id,
        type: 'mobility', // credits balanceMobility only — cannot be withdrawn
        amount: 3000, // R$30,00 in cents
        isUsed: false,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      })
      console.log('[Register] Welcome voucher created:', voucherCode, 'for user', userId)
    } catch (voucherErr) {
      console.error('[Register] NON-CRITICAL: Error creating welcome voucher:', voucherErr)
      // Continue - voucher is optional
    }

    // --- Task 14-E: signup_bonus voucher, sized to the user's "gratuito"
    //     plan-type at registration time. Sends a Notification to alert the
    //     new user. Best-effort — failure here never blocks registration. ---
    try {
      const signupVoucher = await generateVoucherForUser(user.id, 'gratuito')
      console.log(
        '[Register] Signup-bonus voucher created:',
        signupVoucher.code,
        '(R$',
        (signupVoucher.amount / 100).toFixed(2),
        ') for user',
        userId
      )
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Bônus de boas-vindas! 🎁',
            message:
              'Você recebeu um voucher de R$ 5,00. Confira seus vouchers na aba Voucher e use em compras no app!',
            type: 'voucher',
          },
        })
      } catch (notifErr) {
        console.warn('[Register] could not create welcome-bonus notification:', notifErr)
      }
    } catch (signupVoucherErr) {
      console.error(
        '[Register] NON-CRITICAL: Error creating signup_bonus voucher:',
        signupVoucherErr
      )
      // Continue — voucher is optional
    }

    // --- Return success with user data ---
    let safeUser: any
    try {
      safeUser = sanitizeUser(user)
    } catch (sanitizeErr) {
      console.warn('[Register] Warning: sanitizeUser failed, constructing manually:', sanitizeErr)
      // Fallback: manually construct safe user without password
      const { password: _pwd, ...rest } = user as any
      safeUser = rest
    }

    const responseData: any = { user: safeUser }

    return success(responseData, 201)
  } catch (err) {
    console.error('[Register] Unhandled registration error:', err)
    return error('Erro interno do servidor. Tente novamente.', 500)
  }
}
