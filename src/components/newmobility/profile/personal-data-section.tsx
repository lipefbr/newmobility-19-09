'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Calendar, IdCard, Heart, Users, GraduationCap, MapPin, Award, User,
  Pencil, Check, X, Loader2,
} from 'lucide-react'
import { userApi } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  QUALIFICATION_OPTIONS,
  qualificationLabel as resolveQualificationLabel,
} from '@/lib/qualifications'

// ---------- Static option lists ----------

// Task 2-e (Item 4): the qualification dropdown now lives in
// `@/lib/qualifications` and is shared with the admin "Editar Usuário"
// dialog and the self-registration form. Re-exported here under the local
// constant name the rest of this file already uses.
const QUALIFICATION_OPTIONS_LOCAL = QUALIFICATION_OPTIONS

const MARITAL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
] as const

const GENDER_OPTIONS = [
  'Masculino',
  'Feminino',
  'Outro',
  'Prefiro não informar',
] as const

const EDUCATION_OPTIONS = [
  'Ensino Fundamental',
  'Ensino Médio',
  'Ensino Médio Incompleto',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Pós-Graduação',
  'Mestrado',
  'Doutorado',
] as const

// ---------- Helpers ----------

function formatZipCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function formatDateBR(iso: string | Date | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  // Use UTC to avoid timezone off-by-one (birthday stored as UTC midnight)
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function toDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  // Use UTC getters to match the UTC-midnight storage format
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getQualificationLabel(value: string | null | undefined): string {
  if (!value) return '-'
  // Delegate to the shared helper so legacy codes (passageiro / passageiro_60
  // / passageiro_pcd / comercio) also resolve to a friendly label for users
  // registered before Task 2-e expanded the dropdown. Falls back to the raw
  // value when neither table recognises the code.
  const label = resolveQualificationLabel(value)
  return label === '—' ? value : label
}

// ---------- Types ----------

// Task 19-A: Emergency contact fields (emergencyName / emergencyPhone /
// emergencyRelation) were previously duplicated here AND in the parent
// profile-page.tsx Emergency Contact card. Both components read/wrote the
// same DB columns via PUT /api/user/profile, so saving one would silently
// overwrite the other's edits with stale state. The emergency contact
// UI has been removed from this component — it is owned exclusively by
// the parent profile-page.tsx. This component only manages the extended
// personal fields below (birthDate, rg, maritalStatus, etc.).
interface PersonalData {
  birthDate: string | null
  rg: string | null
  maritalStatus: string | null
  gender: string | null
  education: string | null
  zipCode: string | null
  sponsorId: string | null
  qualification: string | null
}

interface SponsorInfo {
  id: string
  name: string
}

// ---------- Component ----------

export function PersonalDataSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const [data, setData] = useState<PersonalData>({
    birthDate: null,
    rg: null,
    maritalStatus: null,
    gender: null,
    education: null,
    zipCode: null,
    sponsorId: null,
    qualification: null,
  })

  // Editable copy while in edit mode
  const [draft, setDraft] = useState<PersonalData>(data)
  const [sponsor, setSponsor] = useState<SponsorInfo | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const profile = await userApi.getProfile(userId)
      const next: PersonalData = {
        birthDate: profile.birthDate ?? null,
        rg: profile.rg ?? null,
        maritalStatus: profile.maritalStatus ?? null,
        gender: profile.gender ?? null,
        education: profile.education ?? null,
        zipCode: profile.zipCode ?? null,
        sponsorId: profile.sponsorId ?? null,
        qualification: profile.qualification ?? null,
      }
      setData(next)
      setDraft(next)

      // Fetch sponsor info if available
      if (profile.sponsorId) {
        try {
          const sponsorProfile = await userApi.getProfile(profile.sponsorId)
          setSponsor({ id: profile.sponsorId, name: sponsorProfile.name || 'Usuário' })
        } catch {
          setSponsor({ id: profile.sponsorId, name: 'Usuário' })
        }
      } else {
        setSponsor(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados pessoais.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      void fetchProfile()
    }
  }, [userId, fetchProfile])

  const handleEdit = () => {
    setDraft(data)
    setEditing(true)
  }

  const handleCancel = () => {
    setDraft(data)
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Task 19-A: Only send the extended personal fields this component
      // manages. Emergency contact fields are intentionally NOT sent —
      // they are owned by the parent profile-page.tsx Emergency Contact
      // card. Sending them here would overwrite the parent's edits with
      // stale state from this component's draft. The PUT /api/user/profile
      // route only updates fields that are explicitly present in the body,
      // so omitting emergencyName/Phone/Relation is safe.
      await userApi.updateProfile(userId, {
        birthDate: draft.birthDate || null,
        rg: draft.rg || null,
        maritalStatus: draft.maritalStatus || null,
        gender: draft.gender || null,
        education: draft.education || null,
        zipCode: draft.zipCode || null,
        sponsorId: draft.sponsorId || null,
        qualification: draft.qualification || null,
      })
      toast.success('Dados pessoais salvos com sucesso!')
      setEditing(false)
      await fetchProfile()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar dados pessoais.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const setField = <K extends keyof PersonalData>(field: K, value: PersonalData[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  // Show data row helper
  const DataField = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string
    value: string
    icon: React.ElementType
  }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      <p className="text-sm font-medium text-foreground">{value || '-'}</p>
    </div>
  )

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <IdCard className="h-4 w-4 text-emerald-600" />
            Dados Pessoais Completos
          </CardTitle>
          <CardDescription className="text-xs">
            Informações complementares do seu perfil
          </CardDescription>
        </div>
        {!editing && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleEdit}
            disabled={loading}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando dados...
          </div>
        ) : !editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DataField
              label="Qualificação"
              value={getQualificationLabel(data.qualification)}
              icon={Award}
            />
            <DataField
              label="Data de Nascimento"
              value={formatDateBR(data.birthDate)}
              icon={Calendar}
            />
            <DataField label="RG" value={data.rg || '-'} icon={IdCard} />
            <DataField
              label="Estado Civil"
              value={data.maritalStatus || '-'}
              icon={Heart}
            />
            <DataField label="Gênero" value={data.gender || '-'} icon={Users} />
            <DataField
              label="Escolaridade"
              value={data.education || '-'}
              icon={GraduationCap}
            />
            <DataField label="CEP" value={data.zipCode || '-'} icon={MapPin} />
            <DataField
              label="Patrocinado por"
              value={sponsor ? sponsor.name : data.sponsorId || '-'}
              icon={User}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarefa (21/09): Qualificação (tipo de usuário) é READ-ONLY para o
                  usuário final. Só o admin pode trocar via painel admin. */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Qualificação
                </Label>
                <Input
                  value={getQualificationLabel(draft.qualification)}
                  disabled
                  className="w-full bg-muted/50 cursor-not-allowed"
                  placeholder="—"
                />
                <p className="text-[10px] text-muted-foreground">
                  Somente o administrador pode alterar sua qualificação.
                </p>
              </div>

              {/* Birth Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data de Nascimento
                </Label>
                <Input
                  type="date"
                  value={toDateInputValue(draft.birthDate)}
                  onChange={(e) => {
                    const val = e.target.value
                    setField('birthDate', val ? new Date(val).toISOString() : null)
                  }}
                />
              </div>

              {/* RG */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <IdCard className="h-3 w-3" />
                  RG
                </Label>
                <Input
                  value={draft.rg || ''}
                  onChange={(e) => setField('rg', e.target.value)}
                  placeholder="00.000.000-0"
                />
              </div>

              {/* CEP */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  CEP
                </Label>
                <Input
                  value={draft.zipCode || ''}
                  onChange={(e) => setField('zipCode', formatZipCode(e.target.value))}
                  placeholder="00000-000"
                />
              </div>

              {/* Marital Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Estado Civil
                </Label>
                <Select
                  value={draft.maritalStatus || ''}
                  onValueChange={(v) => setField('maritalStatus', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Gênero
                </Label>
                <Select
                  value={draft.gender || ''}
                  onValueChange={(v) => setField('gender', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Education */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Escolaridade
                </Label>
                <Select
                  value={draft.education || ''}
                  onValueChange={(v) => setField('education', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sponsor (read-only) */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Patrocinado por
                </Label>
                <Input
                  value={sponsor ? sponsor.name : draft.sponsorId || ''}
                  disabled
                  className="bg-muted/50"
                  placeholder="Sem patrocinador"
                />
                <p className="text-[10px] text-muted-foreground">
                  Campo somente leitura. Definido no cadastro.
                </p>
              </div>
            </div>

            {/* Task 19-A: Emergency Contact section removed from here —
                it was a duplicate of the parent profile-page.tsx Emergency
                Contact card, and the two were overwriting each other's
                saves. The parent card is the canonical UI for emergency
                contact. */}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5',
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Salvar Dados
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PersonalDataSection
