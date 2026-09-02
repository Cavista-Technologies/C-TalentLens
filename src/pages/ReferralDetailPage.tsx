import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { getReferral } from "../features/referrals/referralApi";
import { formatDate, formatValue } from "../features/referrals/referralDisplay";
import type { Referral } from "../features/referrals/referralTypes";
import "../styles/ReferralDetailPage.css";

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReferral() {
      if (!id) {
        if (isMounted) {
          setReferral(null);
          setError("Referral was not found.");
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await getReferral(id);

        if (isMounted) {
          setReferral(data);
        }
      } catch (err) {
        if (isMounted) {
          setReferral(null);
          setError(
            err instanceof Error
              ? err.message
              : "Referral could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReferral();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <AppLayout title="Referral Detail">
      <PageContainer>
        <div className="referral-detail-page">
          <Link className="referral-detail-back-link" to="/referrals">
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to referrals
          </Link>

          {isLoading && (
            <section className="referral-detail-state">
              <LoadingState message="Loading referral..." />
            </section>
          )}

          {!isLoading && error && (
            <section className="referral-detail-state">
              <ErrorState title="Referral unavailable" message={error} />
            </section>
          )}

          {!isLoading && !error && referral && (
            <ReferralDetail referral={referral} />
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

function ReferralDetail({ referral }: { referral: Referral }) {
  const statusClass = getStatusClass(referral.status);

  return (
    <div className="referral-detail-content">
      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="referral-detail-hero">
        <div className="referral-hero-main">
          <div className="candidate-detail-avatar">
            {getInitials(referral.candidateName)}
          </div>

          <div className="referral-hero-copy">
            <div className="referral-code-row">
              <span className="referral-code">{referral.requisitionCode}</span>

              <span className={`detail-status-badge ${statusClass}`}>
                <span className="status-dot" />
                {formatValue(referral.status)}
              </span>
            </div>

            <h1>{referral.candidateName}</h1>

            <p className="referral-role">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M3 12h18" />
              </svg>

              {referral.roleAppliedFor}

              <span className="hero-separator">•</span>

              {formatValue(referral.department)}
            </p>
          </div>
        </div>

        <div className="referral-hero-side">
          <div className="outcome-label">Hiring outcome</div>

          <span className="outcome-badge">
            {formatValue(referral.hiringOutcome)}
          </span>

          {referral.hiredAt && (
            <span className="hired-date">
              Hired {formatDate(referral.hiredAt)}
            </span>
          )}
        </div>
      </section>

      {/* =====================================================
          QUICK STATS
          ===================================================== */}

      <section className="referral-quick-stats" aria-label="Referral summary">
        <QuickStat
          icon="calendar"
          label="Submitted"
          value={formatDate(referral.submissionDate)}
        />

        <QuickStat
          icon="user"
          label="Referred by"
          value={referral.referrerName}
        />

        <QuickStat
          icon="briefcase"
          label="Recruiter"
          value={referral.recruiter}
        />

        <QuickStat
          icon="status"
          label="Outcome"
          value={formatValue(referral.hiringOutcome)}
        />
      </section>

      {/* =====================================================
          MAIN GRID
          ===================================================== */}

      <div className="referral-detail-grid">
        {/* ===================================================
            CANDIDATE
            =================================================== */}

        <DetailPanel
          title="Candidate"
          subtitle="Personal and contact information"
          icon="user"
        >
          <dl className="referral-detail-list">
            <DetailItem
              label="Email address"
              value={referral.candidateEmail || "-"}
            />

            <DetailItem
              label="Phone number"
              value={referral.candidatePhoneNumber || "-"}
            />

            <DetailItem
              label="Submitted"
              value={formatDate(referral.submissionDate)}
            />

            <DetailItem
              label="Resume"
              value={referral.resumeUrl ? "Available" : "Not attached"}
            />
          </dl>

          {referral.resumeUrl && (
            <a
              className="resume-button"
              href={referral.resumeUrl}
              target="_blank"
              rel="noreferrer"
            >
              <svg
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h8M8 17h5" />
              </svg>
              View resume
            </a>
          )}
        </DetailPanel>

        {/* ===================================================
            REFERRER
            =================================================== */}

        <DetailPanel
          title="Referrer"
          subtitle="Employee who submitted the referral"
          icon="people"
        >
          <dl className="referral-detail-list">
            <DetailItem label="Name" value={referral.referrerName} />

            <DetailItem
              label="Department"
              value={referral.referrerDepartment}
            />

            <DetailItem
              label="Employee ID"
              value={referral.referrerEmployeeId || "-"}
            />

            <DetailItem
              label="Submitted by"
              value={referral.submitterName || referral.submitterEmail || "-"}
            />
          </dl>
        </DetailPanel>

        {/* ===================================================
            REFERRAL CONTEXT
            FULL WIDTH
            =================================================== */}

        <DetailPanel
          title="Referral Context"
          subtitle="Relationship and recruitment details"
          icon="info"
          fullWidth
        >
          <dl className="referral-detail-list referral-context-list">
            <DetailItem
              label="Candidate relationship"
              value={referral.candidateRelationship || "-"}
            />

            <DetailItem
              label="Known duration"
              value={referral.candidateKnownDuration || "-"}
            />

            <DetailItem label="Recruiter" value={referral.recruiter} />

            <DetailItem
              label="Resumption date"
              value={referral.hiredAt ? formatDate(referral.hiredAt) : "-"}
            />
          </dl>

          {referral.candidateAlignmentComment && (
            <div className="alignment-note">
              <div className="alignment-note-heading">
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 8.4 8.4 0 0 1-4-.98L3 21l1.98-5A8.4 8.4 0 0 1 4 12c0-4.7 3.6-8.5 8-8.5s9 3.2 9 8Z" />
                </svg>
                Candidate alignment
              </div>

              <p>{referral.candidateAlignmentComment}</p>
            </div>
          )}
        </DetailPanel>

        {/* ===================================================
            HISTORY
            FULL WIDTH AND BELOW REFERRAL CONTEXT
            =================================================== */}

        <DetailPanel
          title="Referral History"
          subtitle="Activity and status changes"
          icon="history"
          fullWidth
        >
          {referral.history.length === 0 ? (
            <div className="empty-history">
              <div className="empty-history-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>

              <strong>No referral history</strong>

              <p>There are no recorded changes for this referral yet.</p>
            </div>
          ) : (
            <div className="referral-history">
              {referral.history.map((item, index) => (
                <div className="referral-history-item" key={item.id}>
                  <div className="history-timeline">
                    <span className="history-dot" />

                    {index < referral.history.length - 1 && (
                      <span className="history-line" />
                    )}
                  </div>

                  <div className="history-content">
                    <div className="history-main">
                      <strong>{formatValue(item.eventType)}</strong>

                      <span className="history-date">
                        {new Date(item.changedAt).toLocaleString()}
                      </span>
                    </div>

                    <span className="history-user">
                      Changed by {item.changedBy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailPanel>
      </div>
    </div>
  );
}

function DetailPanel({
  children,
  fullWidth = false,
  icon,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
  icon: "user" | "people" | "info" | "history";
  subtitle: string;
  title: string;
}) {
  return (
    <article
      className={`referral-detail-panel ${
        fullWidth ? "referral-detail-panel-full" : ""
      }`}
    >
      <div className="detail-panel-heading">
        <div className="detail-panel-title-wrap">
          <div className={`detail-panel-icon ${icon}`}>
            <PanelIcon icon={icon} />
          </div>

          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="detail-panel-body">{children}</div>
    </article>
  );
}

function QuickStat({
  icon,
  label,
  value,
}: {
  icon: "calendar" | "user" | "briefcase" | "status";
  label: string;
  value: string;
}) {
  return (
    <div className="quick-stat">
      <div className={`quick-stat-icon ${icon}`}>
        <PanelIcon icon={icon} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PanelIcon({
  icon,
}: {
  icon:
    | "user"
    | "people"
    | "info"
    | "history"
    | "calendar"
    | "briefcase"
    | "status";
}) {
  if (icon === "calendar") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }

  if (icon === "briefcase") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </svg>
    );
  }

  if (icon === "status") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12 2.3 2.3 4.8-5" />
      </svg>
    );
  }

  if (icon === "people") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M15 5.5a3 3 0 0 1 0 5.8M17 14.5a5.2 5.2 0 0 1 3.5 5" />
      </svg>
    );
  }

  if (icon === "info") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v6M12 7h.01" />
      </svg>
    );
  }

  if (icon === "history") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="referral-detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getStatusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
}
