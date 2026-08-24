import { type FormEvent, useEffect, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { useAuth } from '../features/auth/authContext'
import { canUseRecruitmentWrite } from '../features/auth/roleAccess'
import { getRequisitions } from '../features/requisitions/requisitionApi'
import type { Requisition } from '../features/requisitions/requisitionTypes'
import type { PagedResponse } from '../lib/paginationTypes'

export function RequisitionsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const canWrite = canUseRecruitmentWrite(user)
  const [response, setResponse] = useState<PagedResponse<Requisition> | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [submittedSearch, setSubmittedSearch] = useState(searchParams.get('search') ?? '')
  const [openOnly, setOpenOnly] = useState(getBooleanParam(searchParams, 'openOnly', true))
  const [overdueOnly, setOverdueOnly] = useState(getBooleanParam(searchParams, 'overdueOnly', false))
  const [nearSlaBreach, setNearSlaBreach] = useState(getBooleanParam(searchParams, 'nearSlaBreach', false))
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
  }, [page, submittedSearch, openOnly, overdueOnly, nearSlaBreach])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSubmittedSearch(search)
  }

  function handleFilterChange(update: () => void) {
    setPage(1)
    update()
  }

  const selectedFilterCount = [openOnly, nearSlaBreach, overdueOnly].filter(Boolean).length

  return (
    <AppLayout title="Requisitions">
      <PageContainer>
        <section className="list-toolbar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search role, department, recruiter"
              aria-label="Search requisitions"
            />
            <button type="submit">Search</button>
          </form>

          <div className="filter-menu">
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
          {canWrite && (
            <Link className="action-link" to="/requisitions/new">
              New requisition
            </Link>
          )}
        </section>

        {isLoading && <LoadingState message="Loading requisitions..." />}

        {!isLoading && error && <ErrorState title="Requisitions unavailable" message={error} />}

        {!isLoading && !error && response?.items.length === 0 && (
          <section className="empty-panel">
            <strong>No requisitions found</strong>
            <p>Change the filters and try again.</p>
          </section>
        )}

        {!isLoading && !error && response && response.items.length > 0 && (
          <section className="table-panel" aria-label="Requisitions list">
            <div className="requisition-table">
              <div className="requisition-row table-head">
                <span>Role</span>
                <span>Recruiter</span>
                <span>Status</span>
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
                      {requisition.requisitionCode} - {requisition.department}
                    </span>
                  </div>
                  <div>
                    <strong>{requisition.recruiter}</strong>
                  </div>
                  <div>
                    <strong className="status-text">{formatValue(requisition.currentStatus)}</strong>
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
                    {canWrite && (
                      <Link to={`/requisitions/${requisition.id}/edit`} title="Edit requisition" aria-label={`Edit ${requisition.roleName}`}>
                        <Pencil size={16} aria-hidden="true" />
                      </Link>
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
      </PageContainer>
    </AppLayout>
  )
}

function formatValue(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function getBooleanParam(searchParams: URLSearchParams, key: string, fallback: boolean) {
  const value = searchParams.get(key)

  if (value === null) {
    return fallback
  }

  return value.toLowerCase() === 'true'
}
