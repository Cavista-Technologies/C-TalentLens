import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { useAuth } from '../features/auth/authContext'
import { canUseRecruitmentWrite } from '../features/auth/roleAccess'
import { getReferrals, updateReferralStatus } from '../features/referrals/referralApi'
import { formatDate, formatValue, referralStatuses } from '../features/referrals/referralDisplay'
import type { Referral } from '../features/referrals/referralTypes'

export function ReferralsPage() {
  const { user } = useAuth()
  const canWrite = canUseRecruitmentWrite(user)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadReferrals() {
      setIsLoading(true)
      setError('')

      try {
        const data = await getReferrals({
          search: submittedSearch.trim(),
          status,
          activeOnly,
        })

        if (!isMounted) {
          return
        }

        setReferrals(data)
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
  }, [submittedSearch, status, activeOnly])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedSearch(search)
  }

  function handleReferralUpdated(updated: Referral) {
    setReferrals((current) => current.map((referral) => (referral.id === updated.id ? updated : referral)))
  }

  return (
    <AppLayout title="Referrals">
      <PageContainer>
        <section className="list-toolbar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidate, referrer, role"
              aria-label="Search referrals"
            />
            <button type="submit">Search</button>
          </form>

          <div className="inline-filters">
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {referralStatuses.map((item) => (
                <option value={item} key={item}>
                  {formatValue(item)}
                </option>
              ))}
            </select>
            <label>
              <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
              Active
            </label>
            {canWrite && (
              <Link className="action-link" to="/referrals/new">
                New referral
              </Link>
            )}
          </div>
        </section>

        {isLoading && <LoadingState message="Loading referrals..." />}

        {!isLoading && error && <ErrorState title="Referrals unavailable" message={error} />}

        {!isLoading && !error && referrals.length === 0 && (
          <section className="empty-panel">
            <strong>No referrals found</strong>
            <p>Change the filters and try again.</p>
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
                <span>Update</span>
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
                      {referral.requisitionCode} - {referral.department}
                    </span>
                  </div>
                  <div>
                    <strong>{referral.referrerName}</strong>
                    <span>{referral.referrerDepartment}</span>
                  </div>
                  <div>
                    <span className={`status-pill ${referral.status.toLowerCase()}`}>{formatValue(referral.status)}</span>
                    <span>{formatValue(referral.hiringOutcome)}</span>
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
                  {canWrite ? (
                    <ReferralStatusControl referral={referral} onUpdated={handleReferralUpdated} />
                  ) : (
                    <div>
                      <span className="muted-cell">Read only</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </PageContainer>
    </AppLayout>
  )
}

function ReferralStatusControl({ onUpdated, referral }: { referral: Referral; onUpdated: (referral: Referral) => void }) {
  const [nextStatus, setNextStatus] = useState(referral.status)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setIsSaving(true)
    setError('')

    try {
      const updated = await updateReferralStatus(referral.id, {
        status: nextStatus,
        hiringOutcome: getOutcomeForStatus(nextStatus),
        hiredAt: nextStatus === 'Hired' ? new Date().toISOString().slice(0, 10) : null,
      })

      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="row-actions">
      <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} aria-label="Update referral status">
        {referralStatuses.map((item) => (
          <option value={item} key={item}>
            {formatValue(item)}
          </option>
        ))}
      </select>
      <button type="button" disabled={isSaving || nextStatus === referral.status} onClick={handleSave}>
        {isSaving ? 'Saving' : 'Save'}
      </button>
      {error && <span>{error}</span>}
    </div>
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
