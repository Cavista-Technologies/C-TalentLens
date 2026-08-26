import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/StateMessage'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { getReferral } from '../features/referrals/referralApi'
import { formatDate, formatValue } from '../features/referrals/referralDisplay'
import type { Referral } from '../features/referrals/referralTypes'

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [referral, setReferral] = useState<Referral | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadReferral() {
      if (!id) {
        setError('Referral was not found.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const data = await getReferral(id)

        if (isMounted) {
          setReferral(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Referral could not be loaded.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadReferral()

    return () => {
      isMounted = false
    }
  }, [id])

  return (
    <AppLayout title="Referral Detail">
      <PageContainer>
        <Link className="back-link" to="/referrals">
          Back to referrals
        </Link>

        {isLoading && <LoadingState message="Loading referral..." />}
        {!isLoading && error && <ErrorState title="Referral unavailable" message={error} />}
        {!isLoading && referral && <ReferralDetail referral={referral} />}
      </PageContainer>
    </AppLayout>
  )
}

function ReferralDetail({ referral }: { referral: Referral }) {
  return (
    <>
      <section className="detail-hero">
        <div>
          <p className="eyebrow">{referral.requisitionCode}</p>
          <h2>{referral.candidateName}</h2>
          <p>
            {referral.roleAppliedFor} - {formatValue(referral.department)}
          </p>
        </div>
        <div className="detail-status-stack">
          <span className={`status-pill ${referral.status.toLowerCase()}`}>{formatValue(referral.status)}</span>
          <span className="status-pill">{formatValue(referral.hiringOutcome)}</span>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-panel">
          <div className="panel-heading">
            <h2>Candidate</h2>
          </div>
          <dl className="detail-list">
            <DetailItem label="Email" value={referral.candidateEmail || '-'} />
            <DetailItem label="Phone" value={referral.candidatePhoneNumber || '-'} />
            <DetailItem label="Submitted" value={formatDate(referral.submissionDate)} />
            <DetailItem label="Resume" value={referral.resumeUrl ? 'Available' : 'Not attached'} />
          </dl>
          {referral.resumeUrl && (
            <a className="table-link spaced-link" href={referral.resumeUrl} target="_blank" rel="noreferrer">
              View resume
            </a>
          )}
        </article>

        <article className="detail-panel">
          <div className="panel-heading">
            <h2>Referrer</h2>
          </div>
          <dl className="detail-list">
            <DetailItem label="Name" value={referral.referrerName} />
            <DetailItem label="Team" value={referral.referrerDepartment} />
            <DetailItem label="Employee ID" value={referral.referrerEmployeeId || '-'} />
            <DetailItem label="Submitter" value={referral.submitterName || referral.submitterEmail || '-'} />
          </dl>
        </article>
      </section>

      <article className="detail-panel">
        <div className="panel-heading">
          <h2>Referral Context</h2>
        </div>
        <dl className="detail-list">
          <DetailItem label="Relationship" value={referral.candidateRelationship || '-'} />
          <DetailItem label="Known duration" value={referral.candidateKnownDuration || '-'} />
          <DetailItem label="Recruiter" value={referral.recruiter} />
          <DetailItem label="Hired at" value={referral.hiredAt ? formatDate(referral.hiredAt) : '-'} />
        </dl>
        {referral.candidateAlignmentComment && <p className="detail-note">{referral.candidateAlignmentComment}</p>}
      </article>

      <article className="detail-panel">
        <div className="panel-heading">
          <h2>History</h2>
        </div>
        {referral.history.length === 0 ? (
          <p className="quiet-text">No referral history.</p>
        ) : (
          <div className="history-list">
            {referral.history.map((item) => (
              <div className="history-row" key={item.id}>
                <strong>{formatValue(item.eventType)}</strong>
                <span>{item.changedBy}</span>
                <span>{new Date(item.changedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </article>
    </>
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
