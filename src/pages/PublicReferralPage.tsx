import { type FormEvent, useEffect, useState } from 'react'
import { formatValue, recruitmentTeams } from '../features/requisitions/requisitionDisplay'
import { createPublicReferral, searchPublicRequisitions } from '../features/referrals/referralApi'
import { uploadReferralResume } from '../features/referrals/resumeUpload'
import type { PublicRequisition } from '../features/referrals/referralTypes'

export function PublicReferralPage() {
  const [selectedRequisition, setSelectedRequisition] = useState<PublicRequisition | null>(null)
  const [requisitionSearch, setRequisitionSearch] = useState('')
  const [requisitionResults, setRequisitionResults] = useState<PublicRequisition[]>([])
  const [isSearchingRequisitions, setIsSearchingRequisitions] = useState(false)
  const [requisitionSearchError, setRequisitionSearchError] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
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
          const response = await searchPublicRequisitions(searchTerm)

          if (!isMounted) {
            return
          }

          setRequisitionResults(response)
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
    const referrerEmail = form.get('referrerEmail')?.toString().trim()
    const referrerDepartment = form.get('referrerDepartment')?.toString().trim()
    const candidateName = form.get('candidateName')?.toString().trim()
    const candidateEmail = form.get('candidateEmail')?.toString().trim()

    if (!selectedRequisition || !referrerName || !referrerEmail || !referrerDepartment || !candidateName || !candidateEmail) {
      setError('Complete the required fields.')
      return
    }

    if (!referrerEmail.toLowerCase().endsWith('@cavista.com')) {
      setError('Use your Cavista email address.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const resumeUrl = resumeFile ? await uploadReferralResume(resumeFile) : null

      await createPublicReferral({
        requisitionId: selectedRequisition.id,
        referrerName,
        referrerEmail,
        referrerDepartment,
        candidateName,
        candidateEmail,
        candidatePhoneNumber: nullableValue(form.get('candidatePhoneNumber')),
        resumeUrl,
        candidateRelationship: nullableValue(form.get('candidateRelationship')),
        candidateKnownDuration: nullableValue(form.get('candidateKnownDuration')),
        candidateAlignmentComment: nullableValue(form.get('candidateAlignmentComment')),
      })

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Referral could not be submitted.')
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

  function handleSelectRequisition(requisition: PublicRequisition) {
    setSelectedRequisition(requisition)
    setRequisitionSearch(`${requisition.requisitionCode} - ${requisition.roleName}`)
    setRequisitionResults([])
    setRequisitionSearchError('')
    setIsSearchingRequisitions(false)
  }

  function handleResumeChange(file: File | undefined) {
    setError('')

    if (!file) {
      setResumeFile(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeFile(null)
      setError('Resume must be 5MB or less.')
      return
    }

    setResumeFile(file)
  }

  return (
    <main className="public-referral-page">
      <section className="public-referral-shell">
        <header className="public-referral-hero">
          <div className="public-referral-brand">
            <img src="/cavista-logo.png" alt="Cavista" />
          </div>
          <div>
            <h1>Refer a candidate</h1>
          </div>
        </header>

        {isSubmitted ? (
          <section className="state-message success">
            <strong>Referral submitted</strong>
            <p>The recruiting team can now review this referral in C-TalentLens.</p>
          </section>
        ) : (
          <form className="form-panel public-referral-form" onSubmit={handleSubmit}>
            <section className="form-section">
              <div className="form-section-heading">
                <span>01</span>
                <h2>Requisition</h2>
              </div>
              <label>
                Search open requisitions
                <input
                  value={requisitionSearch}
                  onChange={(event) => handleRequisitionSearch(event.target.value)}
                  placeholder="Type at least 3 characters"
                  aria-describedby="public-requisition-search-status"
                  required
                />
              </label>

              <div className="search-picker" id="public-requisition-search-status">
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
                      {requisition.requisitionCode} - {formatValue(requisition.department)}
                    </span>
                  </button>
                ))}
                {selectedRequisition && (
                  <span>
                    Selected: {selectedRequisition.requisitionCode} - {selectedRequisition.roleName}
                  </span>
                )}
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-heading">
                <span>02</span>
                <h2>Candidate</h2>
              </div>
              <div className="form-grid">
                <label>
                  Candidate name
                  <input name="candidateName" required />
                </label>
                <label>
                  Candidate email
                  <input name="candidateEmail" type="email" required />
                </label>
                <label>
                  Candidate phone
                  <input name="candidatePhoneNumber" />
                </label>
                <div className="file-field">
                  <label htmlFor="publicResumeFile">Resume</label>
                  <input
                    id="publicResumeFile"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => handleResumeChange(event.target.files?.[0])}
                  />
                  {resumeFile && <span>{resumeFile.name}</span>}
                </div>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-heading">
                <span>03</span>
                <h2>Referrer</h2>
              </div>
              <div className="form-grid">
                <label>
                  Your name
                  <input name="referrerName" required />
                </label>
                <label>
                  Your Cavista email
                  <input name="referrerEmail" type="email" required />
                </label>
                <label>
                  Your team
                  <select name="referrerDepartment" defaultValue="" required>
                    <option value="">Select team</option>
                    {recruitmentTeams.map((team) => (
                      <option value={formatValue(team)} key={team}>
                        {formatValue(team)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Relationship to candidate
                  <input name="candidateRelationship" />
                </label>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-heading">
                <span>04</span>
                <h2>Recommendation</h2>
              </div>
              <label>
                Known duration
                <input name="candidateKnownDuration" />
              </label>
              <label>
                Why is this candidate a good fit?
                <textarea name="candidateAlignmentComment" rows={4} />
              </label>
            </section>

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit referral'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}

function nullableValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim()
  return text ? text : null
}
