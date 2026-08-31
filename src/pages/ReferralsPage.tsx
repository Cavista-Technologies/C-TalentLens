import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { useToast } from '../components/feedback/useToast'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { useAuth } from '../features/auth/authContext'
import { canUpdateReferralStatus } from '../features/auth/roleAccess'
import { getReferrals, updateReferralStatus } from '../features/referrals/referralApi'
import { formatDate, formatValue, referralStatuses } from '../features/referrals/referralDisplay'
import type { Referral } from '../features/referrals/referralTypes'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import type { PagedResponse } from '../lib/paginationTypes'

const referralFilterStorageKey = 'c-talentlens:referral-filters'

export function ReferralsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canUpdateStatus = canUpdateReferralStatus(user)
  const storedFilters = readStoredReferralFilters()
  const [response, setResponse] = useState<PagedResponse<Referral> | null>(null)
  const referrals = response?.items ?? []
  const [search, setSearch] = useState(storedFilters.search)
  const [submittedSearch, setSubmittedSearch] = useState(storedFilters.search)
  const [draftStatus, setDraftStatus] = useState(storedFilters.status)
  const [status, setStatus] = useState(storedFilters.status)
  const [draftSubmittedFrom, setDraftSubmittedFrom] = useState(storedFilters.submittedFrom)
  const [submittedFrom, setSubmittedFrom] = useState(storedFilters.submittedFrom)
  const [draftSubmittedTo, setDraftSubmittedTo] = useState(storedFilters.submittedTo)
  const [submittedTo, setSubmittedTo] = useState(storedFilters.submittedTo)
  const [drafts, setDrafts] = useState<Record<string, ReferralDraft>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadReferrals() {
      setIsLoading(true)
      setError('')

      try {
        const data = await getReferrals({
          page,
          pageSize: 10,
          search: submittedSearch.trim(),
          status,
          submittedFrom,
          submittedTo,
        })

        if (!isMounted) {
          return
        }

        setResponse(data)
        setDrafts(
          Object.fromEntries(
            data.items.map((referral) => [
              referral.id,
              {
                status: referral.status,
                hiredAt: referral.hiredAt ?? '',
              },
            ]),
          ),
        )
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(err instanceof Error ? err.message : 'Referrals could not be loaded.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadReferrals()

    return () => {
      isMounted = false
    }
  }, [page, submittedSearch, status, submittedFrom, submittedTo, reloadKey])

  useEffect(() => {
    localStorage.setItem(
      referralFilterStorageKey,
      JSON.stringify({ search: submittedSearch, status, submittedFrom, submittedTo }),
    )
  }, [submittedSearch, status, submittedFrom, submittedTo])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSubmittedSearch(search)
    setStatus(draftStatus)
    setSubmittedFrom(draftSubmittedFrom)
    setSubmittedTo(draftSubmittedTo)
  }

  function clearFilters() {
    setPage(1)
    setSearch('')
    setSubmittedSearch('')
    setDraftStatus('')
    setStatus('')
    setDraftSubmittedFrom('')
    setSubmittedFrom('')
    setDraftSubmittedTo('')
    setSubmittedTo('')
  }

  function updateDraft(referralId: string, draft: Partial<ReferralDraft>) {
    setDrafts((current) => ({
      ...current,
      [referralId]: {
        ...current[referralId],
        ...draft,
      },
    }))
  }

  async function handleSaveChanges() {
    if (!canUpdateStatus) {
      return
    }

    const changedReferrals = referrals.filter((referral) => hasReferralChanged(referral, drafts[referral.id]))

    if (changedReferrals.length === 0) {
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const updated = await Promise.all(
        changedReferrals.map((referral) => {
          const draft = drafts[referral.id]
          return updateReferralStatus(referral.id, {
            status: draft.status,
            hiringOutcome: getOutcomeForStatus(draft.status),
            hiredAt: draft.hiredAt || null,
          })
        }),
      )

      setResponse((current) =>
        current
          ? {
              ...current,
              items: current.items.map((referral) => updated.find((item) => item.id === referral.id) ?? referral),
            }
          : current,
      )
      setReloadKey((current) => current + 1)
      showToast(`${updated.length} referral ${updated.length === 1 ? 'change' : 'changes'} saved`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Referral changes could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const changedCount = referrals.filter((referral) => hasReferralChanged(referral, drafts[referral.id])).length
  useUnsavedChanges(changedCount > 0)
  const referralUpdateTitle = canUpdateStatus ? undefined : 'Only recruiters and Talent Acquisition Managers can update referrals'
  const hasActiveFilters = Boolean(submittedSearch.trim() || status || submittedFrom || submittedTo)

  return (
    <AppLayout title="Referrals">
      <PageContainer>
        <form className="referral-filter-panel" aria-label="Referral filters" onSubmit={handleSearch}>
          <div className="referral-search-form">
            <label>
              Search
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Candidate, referrer, or role"
                aria-label="Search referrals"
              />
            </label>
          </div>

          <div className="referral-filter-grid">
            <label>
              Status
              <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {referralStatuses.map((item) => (
                  <option value={item} key={item}>
                    {formatValue(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Submitted from
              <input type="date" value={draftSubmittedFrom} onChange={(event) => setDraftSubmittedFrom(event.target.value)} />
            </label>
            <label>
              Submitted to
              <input type="date" value={draftSubmittedTo} onChange={(event) => setDraftSubmittedTo(event.target.value)} />
            </label>
          </div>

          <div className="referral-filter-actions">
            <button type="submit">Search</button>
            <button className="secondary-filter-action" type="button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </form>

        {isLoading && <LoadingState message="Loading referrals..." />}

        {!isLoading && error && <ErrorState title="Referrals unavailable" message={error} />}

        {!isLoading && !error && referrals.length === 0 && (
          <section className="empty-panel centered-empty-panel">
            <strong>No referrals found</strong>
            <p>No referrals match the current filters.</p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </section>
        )}

        {!isLoading && !error && referrals.length > 0 && (
          <section className="table-panel" aria-label="Referrals list">
            <div className="referral-table">
              <div className="referral-row table-head">
                <span>Candidate</span>
                <span>Role</span>
                <span>Referrer</span>
                <span>Status</span>
                <span>Resume</span>
                <span>Submitted</span>
                <span>Resumption date</span>
              </div>

              {referrals.map((referral) => (
                <article className="referral-row" key={referral.id}>
                  <div>
                    <Link to={`/referrals/${referral.id}`}>
                      <strong>{referral.candidateName}</strong>
                    </Link>
                    <span>{referral.candidateEmail}</span>
                  </div>
                  <div>
                    <strong>{referral.roleAppliedFor}</strong>
                    <span>
                      {referral.requisitionCode} - {formatValue(referral.department)}
                    </span>
                  </div>
                  <div>
                    <strong>{referral.referrerName}</strong>
                    <span>{referral.referrerDepartment}</span>
                  </div>
                  <div>
                    <select
                      value={drafts[referral.id]?.status ?? referral.status}
                      disabled={!canUpdateStatus}
                      onChange={(event) => {
                        const nextStatus = event.target.value
                        updateDraft(referral.id, {
                          status: nextStatus,
                          hiredAt: nextStatus === 'Hired' ? drafts[referral.id]?.hiredAt || new Date().toISOString().slice(0, 10) : '',
                        })
                      }}
                      aria-label={`Status for ${referral.candidateName}`}
                      title={referralUpdateTitle}
                    >
                      {referralStatuses.map((item) => (
                        <option value={item} key={item}>
                          {formatValue(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {referral.resumeUrl ? (
                      <a className="table-link" href={referral.resumeUrl} target="_blank" rel="noreferrer">
                        View resume
                      </a>
                    ) : (
                      <span className="muted-cell">No resume</span>
                    )}
                  </div>
                  <div>
                    <strong>{formatDate(referral.submissionDate)}</strong>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={drafts[referral.id]?.hiredAt ?? ''}
                      disabled={!canUpdateStatus}
                      onChange={(event) => updateDraft(referral.id, { hiredAt: event.target.value })}
                      aria-label={`Resumption date for ${referral.candidateName}`}
                      title={referralUpdateTitle}
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="table-save-bar">
              <button type="button" disabled={!canUpdateStatus || isSaving || changedCount === 0} onClick={handleSaveChanges} title={referralUpdateTitle}>
                {isSaving ? 'Saving' : 'Save'}
              </button>
            </div>
            {response && (
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
            )}
          </section>
        )}
      </PageContainer>
    </AppLayout>
  )
}

function getOutcomeForStatus(status: string) {
  if (status === 'Hired') {
    return 'Hired'
  }

  if (status === 'Rejected' || status === 'Ineligible') {
    return 'NotHired'
  }

  if (status === 'Withdrawn') {
    return 'Withdrawn'
  }

  return 'Pending'
}

type ReferralDraft = {
  status: string
  hiredAt: string
}

function hasReferralChanged(referral: Referral, draft?: ReferralDraft) {
  if (!draft) {
    return false
  }

  return draft.status !== referral.status || draft.hiredAt !== (referral.hiredAt ?? '')
}

function readStoredReferralFilters() {
  const fallback = {
    search: '',
    status: '',
    submittedFrom: '',
    submittedTo: '',
  }

  try {
    const stored = localStorage.getItem(referralFilterStorageKey)
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback
  } catch {
    return fallback
  }
}
