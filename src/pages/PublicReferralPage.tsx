import { type FormEvent, useEffect, useState } from "react";
import {
  formatValue,
  recruitmentTeams,
} from "../features/requisitions/requisitionDisplay";
import {
  createPublicReferral,
  searchPublicRequisitions,
} from "../features/referrals/referralApi";
import { uploadReferralResume } from "../features/referrals/resumeUpload";
import type { PublicRequisition } from "../features/referrals/referralTypes";
import "../styles/PublicReferralPage.css";

export function PublicReferralPage() {
  const [selectedRequisition, setSelectedRequisition] =
    useState<PublicRequisition | null>(null);
  const [requisitionSearch, setRequisitionSearch] = useState("");
  const [requisitionResults, setRequisitionResults] = useState<
    PublicRequisition[]
  >([]);
  const [isSearchingRequisitions, setIsSearchingRequisitions] = useState(false);
  const [requisitionSearchError, setRequisitionSearchError] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const searchTerm = requisitionSearch.trim();

    if (selectedRequisition || searchTerm.length < 3) {
      return;
    }

    const timer = window.setTimeout(() => {
      async function searchRequisitions() {
        setIsSearchingRequisitions(true);
        setRequisitionSearchError("");

        try {
          const response = await searchPublicRequisitions(searchTerm);

          if (!isMounted) {
            return;
          }

          setRequisitionResults(response);
        } catch (err) {
          if (!isMounted) {
            return;
          }

          setRequisitionSearchError(
            err instanceof Error ? err.message : "Requisition search failed.",
          );
        } finally {
          if (isMounted) {
            setIsSearchingRequisitions(false);
          }
        }
      }

      void searchRequisitions();
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [requisitionSearch, selectedRequisition]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const referrerName = form.get("referrerName")?.toString().trim();
    const referrerEmail = form.get("referrerEmail")?.toString().trim();
    const referrerDepartment = form
      .get("referrerDepartment")
      ?.toString()
      .trim();
    const candidateName = form.get("candidateName")?.toString().trim();
    const candidateEmail = form.get("candidateEmail")?.toString().trim();
    const roleReferredFor = form.get("roleReferredFor")?.toString().trim();
    const candidateRelationship = form
      .get("candidateRelationship")
      ?.toString()
      .trim();
    const candidateKnownDuration = form
      .get("candidateKnownDuration")
      ?.toString()
      .trim();
    const candidateAlignmentComment = form
      .get("candidateAlignmentComment")
      ?.toString()
      .trim();

    setError("");

    if (!selectedRequisition) {
      setError("Please select an open requisition.");
      return;
    }

    if (!referrerName) {
      setError("Please enter your name.");
      return;
    }

    if (!referrerEmail) {
      setError("Please enter your Cavista email address.");
      return;
    }

    if (!referrerEmail.toLowerCase().endsWith("@axxess.com")) {
      setError("Use your Cavista email address.");
      return;
    }

    if (!referrerDepartment) {
      setError("Please select your team.");
      return;
    }

    if (!candidateName) {
      setError("Please enter the candidate's name.");
      return;
    }

    if (!candidateEmail) {
      setError("Please enter the candidate's email address.");
      return;
    }

    if (!roleReferredFor) {
      setError("Please enter the role the candidate is being referred for.");
      return;
    }

    if (!resumeFile) {
      setError("Please upload the candidate's resume.");
      return;
    }

    if (!candidateRelationship) {
      setError("Please select how you know the candidate.");
      return;
    }

    if (!candidateKnownDuration) {
      setError("Please enter how long you have known the candidate.");
      return;
    }

    if (!candidateAlignmentComment) {
      setError(
        "Please describe your professional relationship with the candidate and explain how you can vouch for their fit.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const resumeUrl = await uploadReferralResume(resumeFile);

      await createPublicReferral({
        requisitionId: selectedRequisition.id,
        referrerName,
        referrerEmail,
        referrerDepartment,
        candidateName,
        candidateEmail,
        resumeUrl,
        roleReferedFor: roleReferredFor,
        candidateRelationship,
        candidateKnownDuration,
        candidateAlignmentComment,
      });

      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Referral could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRequisitionSearch(value: string) {
    setRequisitionSearch(value);
    setSelectedRequisition(null);
    setRequisitionSearchError("");

    if (value.trim().length < 3) {
      setRequisitionResults([]);
      setIsSearchingRequisitions(false);
    }
  }

  function handleSelectRequisition(requisition: PublicRequisition) {
    setSelectedRequisition(requisition);
    setRequisitionSearch(
      `${requisition.requisitionCode} - ${requisition.roleName}`,
    );
    setRequisitionResults([]);
    setRequisitionSearchError("");
    setIsSearchingRequisitions(false);
    setError("");
  }

  function handleResumeChange(file: File | undefined) {
    setError("");

    if (!file) {
      setResumeFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeFile(null);
      setError("Resume must be 5MB or less.");
      return;
    }

    setResumeFile(file);
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
            <strong>must be submitted using this form.</strong>
          </p>

          <p>
            Also, by filling this form you accept that referral bonuses are
            subject to company policy, eligibility criteria, and successful
            hiring outcomes.
          </p>

          <ul className="referral-notes">
            <li>
              Referral bonus payments will be processed{" "}
              <strong>
                two months after the referred employee has successfully
                completed four (4) months with the company.
              </strong>
            </li>
            <li>
              Any disciplinary issues involving the referred employee within the
              two-month payment window may result in forfeiture of the referral
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
            noValidate
          >
            <section className="form-section">
              <div className="form-section-heading">
                <span>01</span>
                <h2>Requisition</h2>
              </div>

              <label className="required-field">
                <span>
                  Search open requisitions <span className="required">*</span>
                </span>

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
                  <span className="validation-message">
                    {requisitionSearchError}
                  </span>
                )}

                {!selectedRequisition &&
                  requisitionSearch.trim().length > 0 &&
                  requisitionSearch.trim().length < 3 && (
                    <span className="validation-message">
                      Enter at least 3 characters.
                    </span>
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
                  <span className="selected-requisition">
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
                <label className="form-headers required-field">
                  <span>
                    Candidate name <span className="required">*</span>
                  </span>

                  <input
                    name="candidateName"
                    required
                    placeholder="Enter candidate name"
                  />
                </label>

                <label className="form-headers required-field">
                  <span>
                    Candidate email <span className="required">*</span>
                  </span>

                  <input
                    name="candidateEmail"
                    type="email"
                    required
                    placeholder="Enter candidate email"
                  />
                </label>

                <label className="form-headers required-field">
                  <span>
                    Role Referred For <span className="required">*</span>
                  </span>

                  <input
                    name="roleReferredFor"
                    required
                    placeholder="Enter the role"
                  />
                </label>

                <div className="file-field required-field">
                  <label htmlFor="publicResumeFile" className="form-headers">
                    <span>
                      Resume <span className="required">*</span>
                    </span>
                  </label>

                  <input
                    id="publicResumeFile"
                    name="resume"
                    type="file"
                    required
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
                <label className="form-headers required-field">
                  <span>
                    Your Name <span className="required">*</span>
                  </span>

                  <input
                    name="referrerName"
                    required
                    placeholder="Enter your name"
                  />
                </label>

                <label className="form-headers required-field">
                  <span>
                    Your Cavista Email <span className="required">*</span>
                  </span>

                  <input
                    name="referrerEmail"
                    type="email"
                    required
                    placeholder="Enter your Cavista email"
                  />
                </label>

                <label className="form-headers required-field">
                  <span>
                    Your Team <span className="required">*</span>
                  </span>

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
                  <legend className="form-headers">
                    How do you know this candidate{" "}
                    <span className="required">*</span>
                  </legend>

                  <div className="radio-options">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="candidateRelationship"
                        value="Worked with them"
                        required
                      />
                      <span>Previously worked together</span>
                    </label>

                    <label className="radio-option">
                      <input
                        type="radio"
                        name="candidateRelationship"
                        value="Former colleague"
                      />
                      <span>Friend / Personal connection</span>
                    </label>

                    <label className="radio-option">
                      <input
                        type="radio"
                        name="candidateRelationship"
                        value="Professional network"
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
                        <span>Other</span>
                      </label>

                      <input
                        className="other-reason"
                        type="text"
                        name="candidateRelationshipOther"
                        placeholder="Please specify"
                        aria-label="Other relationship"
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

                <label className="form-headers required-field">
                  <span>
                    How long have you known the above candidate?{" "}
                    <span className="required">*</span>
                  </span>

                  <input
                    name="candidateKnownDuration"
                    required
                    placeholder="Enter duration"
                  />
                </label>

                <label className="form-headers required-field">
                  <span>
                    In line with Cavista Tech’s Employee Referral Policy,
                    referrals must be genuine and based on a prior working
                    relationship.{" "}
                    <strong>
                      Please briefly describe your professional relationship
                      with this candidate and explain how you can vouch for
                      their work ethic, technical capabilities, and cultural fit
                      at Cavista Tech.
                    </strong>{" "}
                    <span className="required">*</span>
                  </span>

                  <textarea
                    name="candidateAlignmentComment"
                    rows={4}
                    required
                    placeholder="Enter your answer"
                  />
                </label>
              </div>
            </section>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

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
