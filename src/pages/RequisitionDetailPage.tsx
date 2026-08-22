import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { useAuth } from '../features/auth/authContext'
import { canUseRecruitmentWrite } from '../features/auth/roleAccess'
import { addActionItem, addBottleneck, completeActionItem, getRequisition, resolveBottleneck } from '../features/requisitions/requisitionApi'
import {
  actionCategories,
  actionPriorities,
  bottleneckCategories,
  bottleneckPriorities,
  formatDate,
  formatDateTime,
  formatValue,
} from '../features/requisitions/requisitionDisplay'
import type { ActionItem, Bottleneck, Requisition, StageTransition } from '../features/requisitions/requisitionTypes'

type OwnerOption = {
  id: string
  name: string
}

type RequisitionDetailSection = 'overview' | 'bottlenecks' | 'actions' | 'history'

const requisitionSections: Array<{
  id: RequisitionDetailSection
  label: string
  description: string
}> = [
  { id: 'overview', label: 'Overview', description: 'Role and hiring progress' },
  { id: 'bottlenecks', label: 'Bottlenecks', description: 'Open blockers and owners' },
  { id: 'actions', label: 'Actions', description: 'Follow-ups and due dates' },
  { id: 'history', label: 'Stage History', description: 'Pipeline movement' },
]

export function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const requestedSection = toRequisitionSection(searchParams.get('section'))
  const requestedAdd = searchParams.get('add')

  useEffect(() => {
    let isMounted = true

    async function loadRequisition() {
      if (!id) {
        setError('Requisition was not found.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const data = await getRequisition(id)

        if (!isMounted) {
          return
        }

        setRequisition(data)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(err instanceof Error ? err.message : 'Requisition could not be loaded.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadRequisition()

    return () => {
      isMounted = false
    }
  }, [id])

  return (
    <AppLayout title="Requisition Detail">
      <PageContainer>
        <Link className="back-link" to="/requisitions">
          Back to requisitions
        </Link>

        {isLoading && <LoadingState message="Loading requisition..." />}

        {!isLoading && error && <ErrorState title="Requisition unavailable" message={error} />}

        {!isLoading && requisition && (
          <RequisitionDetail
            initialAddAction={requestedAdd === 'action'}
            initialAddBottleneck={requestedAdd === 'bottleneck'}
            initialSection={requestedSection}
            onChanged={setRequisition}
            requisition={requisition}
          />
        )}
      </PageContainer>
    </AppLayout>
  )
}

function RequisitionDetail({
  initialAddAction,
  initialAddBottleneck,
  initialSection,
  onChanged,
  requisition,
}: {
  initialAddAction: boolean
  initialAddBottleneck: boolean
  initialSection: RequisitionDetailSection
  onChanged: (requisition: Requisition) => void
  requisition: Requisition
}) {
  const { user } = useAuth()
  const canWrite = canUseRecruitmentWrite(user)
  const [activeSection, setActiveSection] = useState<RequisitionDetailSection>(initialSection)
  const [isAddingBottleneck, setIsAddingBottleneck] = useState(initialAddBottleneck)
  const [isAddingAction, setIsAddingAction] = useState(initialAddAction)
  const openBottlenecks = requisition.bottlenecks.filter((bottleneck) => bottleneck.status !== 'Resolved')
  const openActions = requisition.actionItems.filter((action) => action.status !== 'Completed')
  const ownerOptions = [
    { id: requisition.recruiterUserId, name: requisition.recruiter },
    { id: requisition.hiringManagerUserId, name: requisition.hiringManager },
  ]

  async function reload() {
    onChanged(await getRequisition(requisition.id))
  }

  async function handleBottleneckCreated() {
    setIsAddingBottleneck(false)
    await reload()
  }

  async function handleActionCreated() {
    setIsAddingAction(false)
    await reload()
  }

  return (
    <>
      <section className="detail-hero">
        <div>
          <p className="eyebrow">{requisition.requisitionCode}</p>
          <h2>{requisition.roleName}</h2>
          <p>
            {requisition.department} - {requisition.recruiter}
          </p>
        </div>

        <div className="detail-status-stack">
          <span className={`status-pill ${requisition.currentStatus.toLowerCase()}`}>
            {formatValue(requisition.currentStatus)}
          </span>
          <span className={`sla-pill ${requisition.slaState.toLowerCase()}`}>{formatValue(requisition.slaState)}</span>
        </div>
      </section>

      <section className="detail-workspace">
        <nav className="detail-section-nav" aria-label="Requisition detail sections">
          {requisitionSections.map((section) => (
            <button
              className={activeSection === section.id ? 'active' : undefined}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <strong>{section.label}</strong>
              <span>{section.description}</span>
            </button>
          ))}
        </nav>

        <div className="detail-section-content">
          {activeSection === 'overview' && (
            <section className="detail-grid">
              <DetailPanel title="Overview">
                <dl className="detail-list">
                  <DetailItem label="Hiring manager" value={requisition.hiringManager} />
                  <DetailItem label="Priority" value={formatValue(requisition.priority)} />
                  <DetailItem label="Posting" value={formatValue(requisition.postingType)} />
                  <DetailItem label="Days open" value={`${requisition.daysOpen}`} />
                  <DetailItem label="Opened" value={formatDate(requisition.dateOpened)} />
                  <DetailItem label="Advertised" value={formatDate(requisition.advertisementDate)} />
                </dl>
              </DetailPanel>

              <DetailPanel title="Hiring Progress">
                <div className="progress-block">
                  <strong>
                    {requisition.filledGoal}/{requisition.hiringGoal}
                  </strong>
                  <span>{requisition.remainingGoal} remaining</span>
                </div>
                <dl className="detail-list compact">
                  <DetailItem label="Open bottlenecks" value={`${openBottlenecks.length}`} />
                  <DetailItem label="Open actions" value={`${openActions.length}`} />
                  <DetailItem label="Stalled" value={requisition.isStalled ? 'Yes' : 'No'} />
                </dl>
              </DetailPanel>
            </section>
          )}

          {activeSection === 'bottlenecks' && (
            <DetailPanel
              title="Bottlenecks"
              action={canWrite && (
                <button className="small-action" type="button" onClick={() => setIsAddingBottleneck((current) => !current)}>
                  Add bottleneck
                </button>
              )}
            >
              {openBottlenecks.length === 0 ? (
                <p className="quiet-text">No open bottlenecks.</p>
              ) : (
                <div className="stack-list">
                  {openBottlenecks.map((bottleneck) => (
                    <BottleneckCard
                      bottleneck={bottleneck}
                      canResolve={canResolveBottleneck(bottleneck, user?.id, user?.roles ?? [])}
                      key={bottleneck.id}
                      onResolved={reload}
                      requisitionId={requisition.id}
                    />
                  ))}
                </div>
              )}
            </DetailPanel>
          )}

          {activeSection === 'actions' && (
            <DetailPanel
              title="Action Items"
              action={canWrite && (
                <button className="small-action" type="button" onClick={() => setIsAddingAction((current) => !current)}>
                  Add action
                </button>
              )}
            >
              {openActions.length === 0 ? (
                <p className="quiet-text">No open action items.</p>
              ) : (
                <div className="stack-list">
                  {openActions.map((action) => (
                    <ActionCard
                      action={action}
                      canComplete={canManageAction(action, user?.id, user?.roles ?? [])}
                      key={action.id}
                      onCompleted={reload}
                      requisitionId={requisition.id}
                    />
                  ))}
                </div>
              )}
            </DetailPanel>
          )}

          {activeSection === 'history' && (
            <DetailPanel title="Stage History">
              {requisition.stageHistory.length === 0 ? (
                <p className="quiet-text">No stage history.</p>
              ) : (
                <div className="history-list">
                  {requisition.stageHistory.map((stage) => (
                    <StageRow stage={stage} key={stage.id} />
                  ))}
                </div>
              )}
            </DetailPanel>
          )}
        </div>
      </section>

      {canWrite && isAddingBottleneck && (
        <Modal title="Add bottleneck" onClose={() => setIsAddingBottleneck(false)}>
          <BottleneckForm
            onCancel={() => setIsAddingBottleneck(false)}
            onCreated={handleBottleneckCreated}
            owners={ownerOptions}
            requisitionId={requisition.id}
          />
        </Modal>
      )}

      {canWrite && isAddingAction && (
        <Modal title="Add action" onClose={() => setIsAddingAction(false)}>
          <ActionItemForm
            onCancel={() => setIsAddingAction(false)}
            onCreated={handleActionCreated}
            owners={ownerOptions}
            requisitionId={requisition.id}
          />
        </Modal>
      )}
    </>
  )
}

function toRequisitionSection(value: string | null): RequisitionDetailSection {
  return requisitionSections.some((section) => section.id === value) ? (value as RequisitionDetailSection) : 'overview'
}

function DetailPanel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <article className="detail-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </article>
  )
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" aria-modal="true" role="dialog" aria-labelledby="modal-title">
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function BottleneckCard({
  bottleneck,
  canResolve,
  onResolved,
  requisitionId,
}: {
  bottleneck: Bottleneck
  canResolve: boolean
  onResolved: () => Promise<void>
  requisitionId: string
}) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleResolve() {
    setIsSaving(true)
    try {
      await resolveBottleneck(requisitionId, bottleneck.id, { resolutionSummary: 'Resolved from dashboard.' })
      await onResolved()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <article className="detail-card">
      <div>
        <strong>{bottleneck.title}</strong>
        <span>Owner: {bottleneck.owner}</span>
      </div>
      <p>{bottleneck.reason}</p>
      <span className="meta-line">
        {formatValue(bottleneck.priority)} - {bottleneck.daysOpen} days open
      </span>
      {canResolve && (
        <button className="small-action" type="button" disabled={isSaving} onClick={handleResolve}>
          {isSaving ? 'Resolving...' : 'Resolve'}
        </button>
      )}
    </article>
  )
}

function ActionCard({
  action,
  canComplete,
  onCompleted,
  requisitionId,
}: {
  action: ActionItem
  canComplete: boolean
  onCompleted: () => Promise<void>
  requisitionId: string
}) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleComplete() {
    setIsSaving(true)
    try {
      await completeActionItem(requisitionId, action.id, { completionNotes: 'Completed from dashboard.' })
      await onCompleted()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <article className="detail-card">
      <div>
        <strong>{action.title}</strong>
        <span>{action.owner}</span>
      </div>
      <p>{action.description}</p>
      <span className="meta-line">
        {formatValue(action.priority)}
        {action.dueDate ? ` - Due ${formatDate(action.dueDate)}` : ''}
      </span>
      {canComplete && (
        <button className="small-action" type="button" disabled={isSaving} onClick={handleComplete}>
          {isSaving ? 'Completing...' : 'Complete'}
        </button>
      )}
    </article>
  )
}

function BottleneckForm({
  onCancel,
  onCreated,
  owners,
  requisitionId,
}: {
  onCancel?: () => void
  onCreated: () => Promise<void>
  owners: OwnerOption[]
  requisitionId: string
}) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setIsSaving(true)

    try {
      await addBottleneck(requisitionId, {
        reason: value(form, 'reason'),
        ownerUserId: value(form, 'ownerUserId'),
        category: value(form, 'category') || 'Other',
        priority: value(form, 'priority') || 'Medium',
        description: nullableValue(form.get('description')),
        businessImpact: nullableValue(form.get('businessImpact')),
      })
      event.currentTarget.reset()
      await onCreated()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Reason
        <input name="reason" required />
      </label>
      <Select label="Owner" name="ownerUserId" options={owners.map((owner) => [owner.id, owner.name])} />
      <Select label="Category" name="category" options={bottleneckCategories.map((item) => [item, formatValue(item)])} />
      <Select label="Priority" name="priority" options={bottleneckPriorities.map((item) => [item, formatValue(item)])} />
      <label>
        Description
        <textarea name="description" rows={2} />
      </label>
      <label>
        Business impact
        <textarea name="businessImpact" rows={2} />
      </label>
      <div className="inline-form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Adding...' : 'Add'}
        </button>
        {onCancel && (
          <button className="secondary-action" type="button" disabled={isSaving} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function ActionItemForm({
  onCancel,
  onCreated,
  owners,
  requisitionId,
}: {
  onCancel?: () => void
  onCreated: () => Promise<void>
  owners: OwnerOption[]
  requisitionId: string
}) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setIsSaving(true)

    try {
      await addActionItem(requisitionId, {
        title: nullableValue(form.get('title')),
        description: value(form, 'description'),
        ownerUserId: value(form, 'ownerUserId'),
        category: value(form, 'category') || 'Other',
        priority: value(form, 'priority') || 'Medium',
        dueDate: nullableValue(form.get('dueDate')),
      })
      event.currentTarget.reset()
      await onCreated()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input name="title" />
      </label>
      <label>
        Description
        <input name="description" required />
      </label>
      <Select label="Owner" name="ownerUserId" options={owners.map((owner) => [owner.id, owner.name])} />
      <Select label="Category" name="category" options={actionCategories.map((item) => [item, formatValue(item)])} />
      <Select label="Priority" name="priority" options={actionPriorities.map((item) => [item, formatValue(item)])} />
      <label>
        Due date
        <input name="dueDate" type="date" />
      </label>
      <div className="inline-form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Adding...' : 'Add'}
        </button>
        {onCancel && (
          <button className="secondary-action" type="button" disabled={isSaving} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function Select({ label, name, options }: { label: string; name: string; options: Array<[string, string]> }) {
  return (
    <label>
      {label}
      <select name={name} required>
        {options.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function canResolveBottleneck(bottleneck: Bottleneck, userId: string | undefined, roles: string[]) {
  return bottleneck.ownerUserId === userId || roles.includes('TalentAcquisitionManager')
}

function canManageAction(action: ActionItem, userId: string | undefined, roles: string[]) {
  return action.ownerUserId === userId || roles.includes('TalentAcquisitionManager')
}

function StageRow({ stage }: { stage: StageTransition }) {
  return (
    <div className="history-row">
      <strong>{formatValue(stage.status)}</strong>
      <span>{stage.daysInStage} days</span>
      <span>{formatDateTime(stage.enteredAt)}</span>
    </div>
  )
}

function value(form: FormData, key: string) {
  return form.get(key)?.toString().trim() ?? ''
}

function nullableValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim()
  return text ? text : null
}
