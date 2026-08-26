import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Eye, Pencil, UserRoundCog } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { useAuth } from '../features/auth/authContext'
import { canReassignRecruiter, canUseRecruitmentWrite } from '../features/auth/roleAccess'
import { getRequisitions, reassignRequisitionRecruiter } from '../features/requisitions/requisitionApi'
import { formatValue, pipelineStages, requisitionStatuses } from '../features/requisitions/requisitionDisplay'
import type { Requisition } from '../features/requisitions/requisitionTypes'
import { getUsers } from '../features/users/userApi'
import type { UserSummary } from '../features/users/userTypes'
import type { PagedResponse } from '../lib/paginationTypes'

export function RequisitionsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const canWrite = canUseRecruitmentWrite(user)
  const canReassign = canReassignRecruiter(user)
  const [response, setResponse] = useState<PagedResponse<Requisition> | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [submittedSearch, setSubmittedSearch] = useState(searchParams.get('search') ?? '')
  const [openOnly, setOpenOnly] = useState(getBooleanParam(searchParams, 'openOnly', false))
  const [overdueOnly, setOverdueOnly] = useState(getBooleanParam(searchParams, 'overdueOnly', false))
  const [nearSlaBreach, setNearSlaBreach] = useState(getBooleanParam(searchParams, 'nearSlaBreach', false))
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [stage, setStage] = useState(searchParams.get('stage') ?? '')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reassigning, setReassigning] = useState<Requisition | null>(null)
  const filterRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadRequisitions() {
      setIsLoading(true)
      setError('')

      try {
        const data = await getRequisitions({
          page,
          pageSize: 10,
          search: submittedSearch.trim(),
          openOnly,
          overdueOnly,
          nearSlaBreach,
          status,
          stage,
        })

        if (!isMounted) {
          return
        }

        setResponse(data)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(err instanceof Error ? err.message : 'Requisitions could not be loaded.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadRequisitions()

    return () => {
      isMounted = false
    }
  }, [page, submittedSearch, openOnly, overdueOnly, nearSlaBreach, status, stage])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSubmittedSearch(search)
  }

  function handleFilterChange(update: () => void) {
    setPage(1)
    update()
  }

  function clearRequisitionFilters() {
    setPage(1)
    setOpenOnly(false)
    setNearSlaBreach(false)
    setOverdueOnly(false)
    setStatus('')
    setStage('')
    setIsFilterOpen(false)
  }

  const selectedFilterCount = [openOnly, nearSlaBreach, overdueOnly, Boolean(status), Boolean(stage)].filter(Boolean).length

  return (
    <AppLayout title="Requisitions">
      <PageContainer>
        <section className="list-toolbar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search role, team, recruiter"
              aria-label="Search requisitions"
            />
            <button type="submit">Search</button>
          </form>

          <div className="filter-menu" ref={filterRef}>
            <button
              type="button"
              className="filter-menu-button"
              aria-expanded={isFilterOpen}
              onClick={() => setIsFilterOpen((current) => !current)}
            >
              Filters
              {selectedFilterCount > 0 && <span>{selectedFilterCount}</span>}
            </button>

            {isFilterOpen && (
              <div className="filter-menu-panel" aria-label="Requisition filters">
                <button className="filter-menu-option" type="button" onClick={clearRequisitionFilters}>
                  All requisitions
                </button>
                <label>
                  Status
                  <select value={status} onChange={(event) => handleFilterChange(() => setStatus(event.target.value))}>
                    <option value="">All statuses</option>
                    {requisitionStatuses.map((item) => (
                      <option value={item} key={item}>
                        {formatValue(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Stage
                  <select value={stage} onChange={(event) => handleFilterChange(() => setStage(event.target.value))}>
                    <option value="">All stages</option>
                    {pipelineStages.map((item) => (
                      <option value={item} key={item}>
                        {formatValue(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(event) => handleFilterChange(() => setOpenOnly(event.target.checked))}
                  />
                  Open requisitions
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={nearSlaBreach}
                    onChange={(event) => handleFilterChange(() => setNearSlaBreach(event.target.checked))}
                  />
                  Near SLA breach
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={overdueOnly}
                    onChange={(event) => handleFilterChange(() => setOverdueOnly(event.target.checked))}
                  />
                  Overdue requisitions
                </label>
              </div>
            )}
          </div>
          {canWrite ? (
            <Link className="action-link" to="/requisitions/new">
              New requisition
            </Link>
          ) : (
            <button className="action-link" type="button" disabled title="Only recruiters and Talent Acquisition Managers can create requisitions">
              New requisition
            </button>
          )}
        </section>

        {isLoading && <LoadingState message="Loading requisitions..." />}

        {!isLoading && error && <ErrorState title="Requisitions unavailable" message={error} />}

        {!isLoading && !error && response?.items.length === 0 && (
          <section className="empty-panel centered-empty-panel">
            <strong>No requisitions found</strong>
            <p>No requisitions match the current filters.</p>
          </section>
        )}

        {!isLoading && !error && response && response.items.length > 0 && (
          <section className="table-panel" aria-label="Requisitions list">
            <div className="requisition-table">
              <div className="requisition-row table-head">
                <span>Role</span>
                <span>Recruiter</span>
                <span>Status</span>
                <span>Stage</span>
                <span>Priority</span>
                <span>SLA</span>
                <span>Progress</span>
                <span>Actions</span>
              </div>

              {response.items.map((requisition) => (
                <div className="requisition-row" key={requisition.id}>
                  <div>
                    <Link className="table-row-title" to={`/requisitions/${requisition.id}`}>
                      {requisition.roleName}
                    </Link>
                    <span>
                      {requisition.requisitionCode} - {formatValue(requisition.department)}
                    </span>
                  </div>
                  <div>
                    <strong>{requisition.recruiter}</strong>
                  </div>
                  <div>
                    <strong className="status-text">{formatValue(requisition.currentStatus)}</strong>
                  </div>
                  <div>
                    <strong className="status-text">{formatValue(requisition.currentStage)}</strong>
                  </div>
                  <div>
                    <span className={`priority-pill ${requisition.priority.toLowerCase()}`}>{formatValue(requisition.priority)}</span>
                  </div>
                  <div>
                    <span className={`sla-pill ${requisition.slaState.toLowerCase()}`}>
                      {formatValue(requisition.slaState)}
                    </span>
                    <span className={`days-open ${requisition.slaState.toLowerCase()}`}>{requisition.daysOpen} days open</span>
                  </div>
                  <div>
                    <strong>
                      {requisition.filledGoal}/{requisition.hiringGoal}
                    </strong>
                    <span>{requisition.remainingGoal} remaining</span>
                  </div>
                  <div className="icon-actions">
                    <Link to={`/requisitions/${requisition.id}`} title="View requisition" aria-label={`View ${requisition.roleName}`}>
                      <Eye size={16} aria-hidden="true" />
                    </Link>
                    {canWrite ? (
                      <Link to={`/requisitions/${requisition.id}/edit`} title="Edit requisition" aria-label={`Edit ${requisition.roleName}`}>
                        <Pencil size={16} aria-hidden="true" />
                      </Link>
                    ) : (
                      <button type="button" disabled title="Only recruiters and Talent Acquisition Managers can edit requisitions" aria-label={`Edit ${requisition.roleName}`}>
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                    )}
                    {canReassign ? (
                      <button
                        type="button"
                        title="Reassign recruiter"
                        aria-label={`Reassign recruiter for ${requisition.roleName}`}
                        onClick={() => setReassigning(requisition)}
                      >
                        <UserRoundCog size={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <button type="button" disabled title="Only Talent Acquisition Managers can reassign recruiters" aria-label={`Reassign recruiter for ${requisition.roleName}`}>
                        <UserRoundCog size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination-bar">
              <span>
                Page {response.pagination.page} of {response.pagination.totalPages}
              </span>
              <div>
                <button
                  type="button"
                  disabled={!response.pagination.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!response.pagination.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {reassigning && (
          <ReassignRecruiterModal
            onClose={() => setReassigning(null)}
            onSaved={(updated) => {
              setResponse((current) =>
                current
                  ? {
                      ...current,
                      items: current.items.map((item) => (item.id === updated.id ? updated : item)),
                    }
                  : current,
              )
              setReassigning(null)
            }}
            requisition={reassigning}
          />
        )}
      </PageContainer>
    </AppLayout>
  )
}

function getBooleanParam(searchParams: URLSearchParams, key: string, fallback: boolean) {
  const value = searchParams.get(key)

  if (value === null) {
    return fallback
  }

  return value.toLowerCase() === 'true'
}

function ReassignRecruiterModal({
  onClose,
  onSaved,
  requisition,
}: {
  onClose: () => void
  onSaved: (requisition: Requisition) => void
  requisition: Requisition
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [selectedRecruiter, setSelectedRecruiter] = useState<UserSummary | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = search.trim()

    if (selectedRecruiter || term.length < 3) {
      setResults([])
      return
    }

    let isMounted = true

    async function searchRecruiters() {
      setIsSearching(true)
      setError('')

      try {
        const [recruiters, managers] = await Promise.all([
          getUsers({ role: 'Recruiter', search: term, pageSize: 20 }),
          getUsers({ role: 'TalentAcquisitionManager', search: term, pageSize: 20 }),
        ])

        if (isMounted) {
          setResults(uniqueUsers([...recruiters.items, ...managers.items]))
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Recruiter search failed.')
        }
      } finally {
        if (isMounted) {
          setIsSearching(false)
        }
      }
    }

    void searchRecruiters()

    return () => {
      isMounted = false
    }
  }, [search, selectedRecruiter])

  async function handleSave() {
    if (!selectedRecruiter) {
      setError('Select a recruiter.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const updated = await reassignRequisitionRecruiter(requisition.id, { recruiterUserId: selectedRecruiter.id })
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recruiter could not be reassigned.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" aria-modal="true" role="dialog" aria-labelledby="reassign-recruiter-title">
        <div className="modal-heading">
          <h2 id="reassign-recruiter-title">Reassign recruiter</h2>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="inline-form">
          <label>
            Recruiter
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setSelectedRecruiter(null)
              }}
              placeholder="Search recruiter"
            />
          </label>

          <div className="search-picker">
            {isSearching && <span>Searching...</span>}
            {!selectedRecruiter && search.trim().length > 0 && search.trim().length < 3 && <span>Enter at least 3 characters.</span>}
            {!selectedRecruiter && !isSearching && search.trim().length >= 3 && results.length === 0 && <span>No matching recruiters.</span>}
            {results.map((recruiter) => (
              <button
                type="button"
                key={recruiter.id}
                onClick={() => {
                  setSelectedRecruiter(recruiter)
                  setSearch(recruiter.fullName)
                  setResults([])
                }}
              >
                <strong>{recruiter.fullName}</strong>
                <span>{recruiter.department ?? 'Recruiting'}</span>
              </button>
            ))}
            {selectedRecruiter && (
              <span>
                Selected: {selectedRecruiter.fullName}
              </span>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="inline-form-actions">
            <button className="secondary-action" type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving' : 'Save'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function uniqueUsers(users: UserSummary[]) {
  return [...new Map(users.map((user) => [user.id, user])).values()].sort((left, right) =>
    left.fullName.localeCompare(right.fullName),
  )
}
