import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { createReferral } from '../features/referrals/referralApi'
import { getRequisitions } from '../features/requisitions/requisitionApi'
import type { Requisition } from '../features/requisitions/requisitionTypes'

export function NewReferralPage() {
  const navigate = useNavigate()
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [requisitionSearch, setRequisitionSearch] = useState('')
  const [requisitionResults, setRequisitionResults] = useState<Requisition[]>([])
  const [isSearchingRequisitions, setIsSearchingRequisitions] = useState(false)
  const [requisitionSearchError, setRequisitionSearchError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const searchTerm = requisitionSearch.trim()

    if (selectedRequisition || searchTerm.length < 3) {
      return
    }

    const timer = window.setTimeout(() => {
      async function searchRequisitions() {
        setIsSearchingRequisitions(true)
        setRequisitionSearchError('')

        try {
          const response = await getRequisitions({
            page: 1,
            pageSize: 10,
            openOnly: true,
            search: searchTerm,
          })

          if (!isMounted) {
            return
          }

          setRequisitionResults(response.items)
        } catch (err) {
          if (!isMounted) {
            return
          }

          setRequisitionSearchError(err instanceof Error ? err.message : 'Requisition search failed.')
        } finally {
          if (isMounted) {
            setIsSearchingRequisitions(false)
          }
        }
      }

      void searchRequisitions()
    }, 300)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [requisitionSearch, selectedRequisition])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const referrerName = form.get('referrerName')?.toString().trim()
    const referrerDepartment = form.get('referrerDepartment')?.toString().trim()
    const candidateName = form.get('candidateName')?.toString().trim()

    if (!selectedRequisition || !referrerName || !referrerDepartment || !candidateName) {
      setError('Complete the required fields.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await createReferral({
        requisitionId: selectedRequisition.id,
        referrerName,
        referrerDepartment,
        candidateName,
        submissionDate: form.get('submissionDate')?.toString() || new Date().toISOString().slice(0, 10),
        candidateEmail: nullableValue(form.get('candidateEmail')),
        candidatePhoneNumber: nullableValue(form.get('candidatePhoneNumber')),
        resumeUrl: nullableValue(form.get('resumeUrl')),
        referrerEmployeeId: nullableValue(form.get('referrerEmployeeId')),
        submitterName: nullableValue(form.get('submitterName')),
        submitterEmail: nullableValue(form.get('submitterEmail')),
        candidateRelationship: nullableValue(form.get('candidateRelationship')),
        candidateKnownDuration: nullableValue(form.get('candidateKnownDuration')),
        candidateAlignmentComment: nullableValue(form.get('candidateAlignmentComment')),
      })

      navigate('/referrals')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Referral could not be created.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleRequisitionSearch(value: string) {
    setRequisitionSearch(value)
    setSelectedRequisition(null)
    setRequisitionSearchError('')

    if (value.trim().length < 3) {
      setRequisitionResults([])
      setIsSearchingRequisitions(false)
    }
  }

  function handleSelectRequisition(requisition: Requisition) {
    setSelectedRequisition(requisition)
    setRequisitionSearch(`${requisition.requisitionCode} - ${requisition.roleName}`)
    setRequisitionResults([])
    setRequisitionSearchError('')
    setIsSearchingRequisitions(false)
  }

  return (
    <AppLayout title="New Referral">
      <PageContainer>
        <Link className="back-link" to="/referrals">
          Back to referrals
        </Link>

        <form className="form-panel centered-form" onSubmit={handleSubmit}>
          <label>
            Requisition
            <input
              value={requisitionSearch}
              onChange={(event) => handleRequisitionSearch(event.target.value)}
              placeholder="Type at least 3 characters"
              aria-describedby="requisition-search-status"
              required
            />
          </label>

          <input type="hidden" name="requisitionId" value={selectedRequisition?.id ?? ''} />

          <div className="search-picker" id="requisition-search-status">
            {isSearchingRequisitions && <span>Searching...</span>}
            {requisitionSearchError && <span>{requisitionSearchError}</span>}
            {!selectedRequisition && requisitionSearch.trim().length > 0 && requisitionSearch.trim().length < 3 && (
              <span>Enter at least 3 characters.</span>
            )}
            {!selectedRequisition && !isSearchingRequisitions && requisitionSearch.trim().length >= 3 && requisitionResults.length === 0 && (
              <span>No matching requisitions.</span>
            )}
            {requisitionResults.map((requisition) => (
              <button type="button" key={requisition.id} onClick={() => handleSelectRequisition(requisition)}>
                <strong>{requisition.roleName}</strong>
                <span>
                  {requisition.requisitionCode} - {requisition.department}
                </span>
              </button>
            ))}
            {selectedRequisition && (
              <span>
                Selected: {selectedRequisition.requisitionCode} - {selectedRequisition.roleName}
              </span>
            )}
          </div>

          <div className="form-grid">
            <label>
              Candidate name
              <input name="candidateName" required />
            </label>
            <label>
              Candidate email
              <input name="candidateEmail" type="email" />
            </label>
            <label>
              Candidate phone
              <input name="candidatePhoneNumber" />
            </label>
            <label>
              Resume URL
              <input name="resumeUrl" type="url" />
            </label>
            <label>
              Referrer name
              <input name="referrerName" required />
            </label>
            <label>
              Referrer department
              <input name="referrerDepartment" required />
            </label>
            <label>
              Referrer employee ID
              <input name="referrerEmployeeId" />
            </label>
            <label>
              Submission date
              <input name="submissionDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
            <label>
              Submitter name
              <input name="submitterName" />
            </label>
            <label>
              Submitter email
              <input name="submitterEmail" type="email" />
            </label>
          </div>

          <label>
            Relationship to candidate
            <input name="candidateRelationship" />
          </label>
          <label>
            Known duration
            <input name="candidateKnownDuration" />
          </label>
          <label>
            Alignment comment
            <textarea name="candidateAlignmentComment" rows={4} />
          </label>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link className="cancel-link" to="/referrals">
              Cancel
            </Link>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </PageContainer>
    </AppLayout>
  )
}

function nullableValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim()
  return text ? text : null
}
