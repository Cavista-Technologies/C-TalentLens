import { type FormEvent, useEffect, useState } from 'react'
import { formatValue, recruitmentTeams } from '../features/requisitions/requisitionDisplay'
import { createPublicReferral, searchPublicRequisitions } from '../features/referrals/referralApi'
import { uploadReferralResume } from '../features/referrals/resumeUpload'
import type { PublicRequisition } from '../features/referrals/referralTypes'
import "../styles/PublicReferralPage.css";

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
    const referrerName = form.get('referrerName')?.toString().trim();
    const referrerEmail = form.get('referrerEmail')?.toString().trim();
    const referrerDepartment = form.get('referrerDepartment')?.toString().trim();
    const candidateName = form.get('candidateName')?.toString().trim();
    const candidateEmail = form.get('candidateEmail')?.toString().trim();
    const roleReferedFor = form.get('roleReferedFor')?.toString().trim();

    if (!selectedRequisition || !referrerName || !referrerEmail || !referrerDepartment || !candidateName || !candidateEmail || roleReferedFor) {
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
        resumeUrl,
        roleReferedFor,
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
          <p>Help us find great people. Your referral makes a difference.</p>
          <p>
            {" "}
            Hi, . When you submit this form, the owner will see your name and
            email address.
          </p>
          <p>
            <strong>*</strong>Required
          </p>
          <p>
            This form is used to officially record employee referrals for open
            roles within the organization. To ensure no referrals are missed and
            to allow accurate tracking of candidates and referral bonuses, all
            employee referrals{" "}
            <strong> must be submitted using this form. </strong>
          </p>
          <p>
            Also, by filling this form you accept that referral bonuses are
            subject to company policy, eligibility criteria, and successful
            hiring outcomes.
          </p>
          <ul>
            Please note that:

            <li>
              Referral bonus payments will be processed <strong>two months after the
              referred employee has successfully completed four (4) months with
              the company.</strong>
            </li>
            <li>
              Any disciplinary issues involving the referred employee within the
              two‑month payment window may result in forfeiture of the referral
              bonus.
            </li>
          </ul>
        </header>
        {isSubmitted ? (
          <section className="state-message success">
            <strong>Referral submitted</strong>
            <p>
              The recruiting team can now review this referral in C-TalentLens.
            </p>
          </section>
        ) : (
          <form
            className="form-panel public-referral-form"
            onSubmit={handleSubmit}
          >
            <section className="form-section">
              <div className="text-section"></div>
              <div className="form-section-heading">
                <span>01</span>
                <h2>Requisition</h2>
              </div>
              <label>
                Search open requisitions
                <input
                  value={requisitionSearch}
                  onChange={(event) =>
                    handleRequisitionSearch(event.target.value)
                  }
                  placeholder="Type at least 3 characters"
                  aria-describedby="public-requisition-search-status"
                  required
                />
              </label>

              <div
                className="search-picker"
                id="public-requisition-search-status"
              >
                {isSearchingRequisitions && <span>Searching...</span>}
                {requisitionSearchError && (
                  <span>{requisitionSearchError}</span>
                )}
                {!selectedRequisition &&
                  requisitionSearch.trim().length > 0 &&
                  requisitionSearch.trim().length < 3 && (
                    <span>Enter at least 3 characters.</span>
                  )}
                {!selectedRequisition &&
                  !isSearchingRequisitions &&
                  requisitionSearch.trim().length >= 3 &&
                  requisitionResults.length === 0 && (
                    <span>No matching requisitions.</span>
                  )}
                {requisitionResults.map((requisition) => (
                  <button
                    type="button"
                    key={requisition.id}
                    onClick={() => handleSelectRequisition(requisition)}
                  >
                    <strong>{requisition.roleName}</strong>
                    <span>
                      {requisition.requisitionCode} -{" "}
                      {formatValue(requisition.department)}
                    </span>
                  </button>
                ))}
                {selectedRequisition && (
                  <span>
                    Selected: {selectedRequisition.requisitionCode} -{" "}
                    {selectedRequisition.roleName}
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
                <label className='form-headers'>
                  Candidate name
                  <input name="candidateName" required placeholder='Enter your name'/>
                </label>
                <label className='form-headers'>
                  Candidate email
                  <input name="candidateEmail" type="email" required placeholder='Enter your name'/>
                </label>
                <label className='form-headers'>
                  Role Referred For
                  <input
                    name="roleReferredFor"
                    placeholder="Enter your answer"
                    required
                  />
                </label>
                <div className="file-field">
                  <label htmlFor="publicResumeFile" className='form-headers'>Resume</label>
                  <input
                    id="publicResumeFile"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) =>
                      handleResumeChange(event.target.files?.[0])
                    }
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
                <label className='form-headers'>
                  Your Name
                  <input name="referrerName" required placeholder='Enter your name'/>
                </label>
                <label className='form-headers'>
                  Your Axxess Email
                  <input name="referrerEmail" type="email" required placeholder='Enter your name'/>
                </label>
                <label className='form-headers'>
                  Your Team
                  <select name="referrerDepartment" defaultValue="" required>
                    <option value="">Select team</option>
                    {recruitmentTeams.map((team) => (
                      <option value={formatValue(team)} key={team}>
                        {formatValue(team)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-heading">
                <span>04</span>
                <h2>Recommendation</h2>
              </div>
              <div className="recommendation-fields">
                <fieldset className="radio-field">
                  <legend className='form-headers'>How do you know this candidate?</legend>
                  <div className="radio-options">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="candidateRelationship"
                        value="Worked with them"
                        placeholder='Enter your name'
                        required
                      />
                      <span>Previously worked together</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="candidateRelationship"
                        value="Former colleague"
                        placeholder="Enter your answer"
                      />
                      <span>Friend / Personal connection</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="candidateRelationship"
                        value="Professional network"
                        placeholder="Enter your answer"
                      />
                      <span>Professional network</span>
                    </label>
                    <div className="radio-other">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="candidateRelationship"
                          value="Other"
                        />
                      </label>
                      <input
                        className="other-reason"
                        type="text"
                        name="candidateRelationship"
                        placeholder="Others"
                        aria-label="Other relationshipOther"
                        onFocus={(event) => {
                          const radio = event.currentTarget
                            .closest(".radio-other")
                            ?.querySelector<HTMLInputElement>(
                              'input[type="radio"]',
                            );
                          if (radio) {
                            radio.checked = true;
                          }
                        }}
                      />
                    </div>
                  </div>
                </fieldset>
                <label>
                  <label className='form-headers'>How long have you known the above candidate?</label>
                  <input name="candidateKnownDuration" placeholder='Enter your name'/>
                </label>
                <label className='form-headers'>
                  In line with Cavista Tech’s Employee Referral Policy,
                  referrals must be genuine and based on a prior working
                  relationship. <strong>Please briefly describe your professional
                  relationship with this candidate and explain how you can vouch
                  for their work ethic, technical capabilities, and cultural fit
                  at Cavista Tech.</strong>
                  <textarea
                    name="candidateAlignmentComment"
                    rows={4}
                    placeholder="Enter your answer"
                  />
                </label>
              </div>
            </section>

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Referral"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function nullableValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim()
  return text ? text : null
}
