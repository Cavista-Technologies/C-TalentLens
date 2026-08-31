import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { useToast } from '../components/feedback/useToast'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { BackButton } from '../components/navigation/BackButton'
import { useAuth } from '../features/auth/authContext'
import { canReassignRecruiter } from '../features/auth/roleAccess'
import {
  createRequisition,
  getRequisition,
  updateRequisition,
} from '../features/requisitions/requisitionApi'
import {
  formatValue,
  openingReasons,
  postingTypes,
  recruitmentTeams,
  requisitionPriorities,
  requisitionStatuses,
} from '../features/requisitions/requisitionDisplay'
import type { Requisition } from '../features/requisitions/requisitionTypes'
import { getUsers } from '../features/users/userApi'
import type { UserSummary } from '../features/users/userTypes'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'

export function RequisitionFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const isEditing = Boolean(id)
  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [recruiters, setRecruiters] = useState<UserSummary[]>([])
  const [hiringManagers, setHiringManagers] = useState<UserSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [openingReason, setOpeningReason] = useState('Other')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { confirmDiscard } = useUnsavedChanges(hasUnsavedChanges)
  const canReassign = canReassignRecruiter(user)
  const backTarget = id ? `/requisitions/${id}` : '/requisitions'

  useEffect(() => {
    let isMounted = true

    async function loadFormData() {
      setIsLoading(true)
      setError('')

      try {
        const [recruiterList, taManagerList, hiringManagerList, current] = await Promise.all([
          getUsers({ role: 'Recruiter', pageSize: 100 }),
          getUsers({ role: 'TalentAcquisitionManager', pageSize: 100 }),
          getUsers({ role: 'HiringManager', pageSize: 100 }),
          id ? getRequisition(id) : Promise.resolve(null),
        ])

        if (!isMounted) {
          return
        }

        setRecruiters(uniqueUsers([...recruiterList.items, ...taManagerList.items]))
        setHiringManagers(hiringManagerList.items)
        setRequisition(current)
        setOpeningReason(current?.openingReason ?? 'Other')
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Form data could not be loaded.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadFormData()

    return () => {
      isMounted = false
    }
  }, [id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const roleName = value(form, 'roleName')
    const department = value(form, 'department')
    const hiringManagerUserId = value(form, 'hiringManagerUserId')
    const recruiterUserId = value(form, 'recruiterUserId')

    if (!roleName || !department || !hiringManagerUserId || !recruiterUserId) {
      setError('Complete the required fields.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const request = {
        roleName,
        department,
        hiringManagerUserId,
        recruiterUserId,
        priority: value(form, 'priority') || 'Medium',
        dateOpened: value(form, 'dateOpened') || new Date().toISOString().slice(0, 10),
        hiringGoal: Number(value(form, 'hiringGoal') || 1),
        openingReason: value(form, 'openingReason') || 'Other',
        customOpeningReason: nullableValue(form.get('customOpeningReason')),
        postingType: value(form, 'postingType') || 'External',
        statusComment: nullableValue(form.get('statusComment')),
        hiringManagerNotes: nullableValue(form.get('hiringManagerNotes')),
      }

      const saved =
        isEditing && id
          ? await updateRequisition(id, {
              ...request,
              filledGoal: Number(value(form, 'filledGoal') || 0),
              currentStatus: value(form, 'currentStatus') || 'Active',
              closedDate: nullableValue(form.get('closedDate')),
            })
          : await createRequisition({ ...request, requisitionCode: value(form, 'requisitionCode') })

      setHasUnsavedChanges(false)
      showToast(isEditing ? 'Requisition updated' : 'Requisition created')
      navigate(`/requisitions/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Requisition could not be saved.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout title={isEditing ? 'Edit Requisition' : 'New Requisition'}>
      <PageContainer>
        <BackButton fallbackTo={backTarget} onBeforeNavigate={confirmDiscard} />

        {isLoading && (
          <section className="centered-page-loader">
            <LoadingState branded message="Loading requisition form" />
          </section>
        )}
        {!isLoading && error && !recruiters.length && !hiringManagers.length && <ErrorState title="Form unavailable" message={error} />}

        {!isLoading && recruiters.length > 0 && hiringManagers.length > 0 && (
          <form className="form-panel requisition-form-shell" onChange={() => setHasUnsavedChanges(true)} onSubmit={handleSubmit}>
            <section className="requisition-form-hero">
              <div>
                <span>{isEditing ? 'Edit requisition' : 'New requisition'}</span>
                <strong>{requisition?.roleName ?? 'Role setup'}</strong>
              </div>
              {isEditing && requisition && (
                <div className="requisition-form-meta">
                  <span>{requisition.requisitionCode}</span>
                  <span>{formatValue(requisition.currentStatus)}</span>
                </div>
              )}
            </section>

            <div className="requisition-form-sections">
              <FormSection title="Role details">
                <div className="form-grid">
                  {!isEditing && (
                    <label>
                      Requisition code
                      <input name="requisitionCode" required />
                    </label>
                  )}
                  <label className="wide-field">
                    Role name
                    <input name="roleName" defaultValue={requisition?.roleName} required />
                  </label>
                  <label>
                    Team
                    <Select name="department" options={recruitmentTeams} defaultValue={requisition?.department ?? 'Talent'} />
                  </label>
                  <label>
                    Posting
                    <Select name="postingType" options={postingTypes} defaultValue={requisition?.postingType ?? 'External'} />
                  </label>
                  <label>
                    Opening reason
                    <Select
                      name="openingReason"
                      options={openingReasons}
                      defaultValue={requisition?.openingReason ?? 'Other'}
                      onChange={setOpeningReason}
                    />
                  </label>
                  {openingReason === 'Other' && (
                    <label>
                      Custom reason
                      <input name="customOpeningReason" defaultValue={requisition?.customOpeningReason ?? ''} />
                    </label>
                  )}
                </div>
              </FormSection>

              <FormSection title="Ownership">
                <div className="form-grid">
                  <label>
                    Hiring manager
                    <UserSelect name="hiringManagerUserId" users={hiringManagers} defaultValue={requisition?.hiringManagerUserId} />
                  </label>
                  <label>
                    Recruiter
                    <UserSelect
                      name="recruiterUserId"
                      users={recruiters}
                      defaultValue={requisition?.recruiterUserId}
                      disabled={isEditing && !canReassign}
                    />
                    {isEditing && !canReassign && <input type="hidden" name="recruiterUserId" value={requisition?.recruiterUserId ?? ''} />}
                  </label>
                </div>
              </FormSection>

              <FormSection title="Hiring plan">
                <div className="form-grid">
                  <label>
                    Priority
                    <Select name="priority" options={requisitionPriorities} defaultValue={requisition?.priority ?? 'Medium'} />
                  </label>
                  <label>
                    Date opened
                    <input name="dateOpened" type="date" defaultValue={requisition?.dateOpened ?? new Date().toISOString().slice(0, 10)} />
                  </label>
                  <label>
                    Hiring goal
                    <input name="hiringGoal" type="number" min="1" defaultValue={requisition?.hiringGoal ?? 1} />
                  </label>
                  {isEditing && (
                    <label>
                      Filled goal
                      <input name="filledGoal" type="number" min="0" defaultValue={requisition?.filledGoal ?? 0} />
                    </label>
                  )}
                </div>
              </FormSection>

              {isEditing && (
                <FormSection title="Status">
                  <div className="form-grid">
                    <label>
                      Status
                      <Select name="currentStatus" options={requisitionStatuses} defaultValue={requisition?.currentStatus ?? 'Active'} />
                    </label>
                    <label>
                      Closed date
                      <input name="closedDate" type="date" defaultValue={requisition?.closedDate ?? ''} />
                    </label>
                  </div>
                </FormSection>
              )}

              <FormSection title="Notes">
                <div className="form-grid">
                  <label>
                    Status comment
                    <textarea name="statusComment" rows={3} defaultValue={requisition?.statusComment ?? ''} />
                  </label>
                  <label>
                    Hiring manager notes
                    <textarea name="hiringManagerNotes" rows={3} defaultValue={requisition?.hiringManagerNotes ?? ''} />
                  </label>
                </div>
              </FormSection>
            </div>

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions requisition-form-actions">
              <button className="secondary-action" type="button" onClick={() => confirmDiscard() && navigate(backTarget)}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || !hasUnsavedChanges}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </PageContainer>
    </AppLayout>
  )
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="requisition-form-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function UserSelect({
  defaultValue,
  disabled = false,
  name,
  users,
}: {
  defaultValue?: string
  disabled?: boolean
  name: string
  users: UserSummary[]
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ''} disabled={disabled} required>
      <option value="">Select user</option>
      {users.map((user) => (
        <option value={user.id} key={user.id}>
          {user.fullName}
        </option>
      ))}
    </select>
  )
}

function Select({
  defaultValue,
  name,
  onChange,
  options,
}: {
  defaultValue?: string
  name: string
  onChange?: (value: string) => void
  options: string[]
}) {
  return (
    <select name={name} defaultValue={defaultValue} onChange={(event) => onChange?.(event.target.value)}>
      {options.map((option) => (
        <option value={option} key={option}>
          {formatValue(option)}
        </option>
      ))}
    </select>
  )
}

function uniqueUsers(users: UserSummary[]) {
  return [...new Map(users.map((user) => [user.id, user])).values()].sort((left, right) =>
    left.fullName.localeCompare(right.fullName),
  )
}

function value(form: FormData, key: string) {
  return form.get(key)?.toString().trim() ?? ''
}

function nullableValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim()
  return text ? text : null
}
