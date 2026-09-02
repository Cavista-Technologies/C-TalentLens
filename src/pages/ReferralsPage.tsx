import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { useAuth } from "../features/auth/authContext";
import { canUpdateReferralStatus } from "../features/auth/roleAccess";
import {
  getReferrals,
  updateReferralStatus,
} from "../features/referrals/referralApi";
import {
  formatDate,
  formatValue,
  referralStatuses,
} from "../features/referrals/referralDisplay";
import type { Referral } from "../features/referrals/referralTypes";
import type { PagedResponse } from "../lib/paginationTypes";
import "../styles/ReferralsPage.css";

const referralFilterStorageKey = "c-talentlens:referral-filters";

type ReferralFilters = {
  search: string;
  status: string;
  submittedFrom: string;
  submittedTo: string;
};

type ReferralDraft = {
  status: string;
  hiredAt: string;
};

export function ReferralsPage() {
  const { user } = useAuth();
  const canUpdateStatus = canUpdateReferralStatus(user);

  const storedFilters = readStoredReferralFilters();

  const [response, setResponse] = useState<PagedResponse<Referral> | null>(
    null,
  );

  const referrals = response?.items ?? [];

  const [search, setSearch] = useState<string>(storedFilters.search);
  const [submittedSearch, setSubmittedSearch] = useState<string>(
    storedFilters.search,
  );

  const [status, setStatus] = useState<string>(storedFilters.status);
  const [submittedFrom, setSubmittedFrom] = useState<string>(
    storedFilters.submittedFrom,
  );
  const [submittedTo, setSubmittedTo] = useState<string>(
    storedFilters.submittedTo,
  );

  const [drafts, setDrafts] = useState<Record<string, ReferralDraft>>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  /*
   * Automatically search after 3+ characters.
   *
   * Clearing the search immediately reloads the full list.
   */
  useEffect(() => {
    const trimmedSearch = search.trim();

    if (trimmedSearch.length > 0 && trimmedSearch.length < 3) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setPage(1);
        setSubmittedSearch(trimmedSearch);
      },
      trimmedSearch.length === 0 ? 0 : 450,
    );

    return () => window.clearTimeout(timer);
  }, [search]);

  /*
   * Automatically reload when date filters change.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [submittedFrom, submittedTo]);

  /*
   * Load referrals.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadReferrals() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getReferrals({
          page,
          pageSize: 10,
          search: submittedSearch.trim(),
          status,
          submittedFrom,
          submittedTo,
        });

        if (!isMounted) {
          return;
        }

        setResponse(data);

        setDrafts(
          Object.fromEntries(
            data.items.map((referral) => [
              referral.id,
              {
                status: referral.status,
                hiredAt: referral.hiredAt ?? "",
              },
            ]),
          ),
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Referrals could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReferrals();

    return () => {
      isMounted = false;
    };
  }, [page, submittedSearch, status, submittedFrom, submittedTo]);

  /*
   * Persist filters.
   */
  useEffect(() => {
    localStorage.setItem(
      referralFilterStorageKey,
      JSON.stringify({
        search: submittedSearch,
        status,
        submittedFrom,
        submittedTo,
      }),
    );
  }, [submittedSearch, status, submittedFrom, submittedTo]);

  /*
   * Update a referral draft.
   */
  function updateDraft(
    referralId: string,
    draft: Partial<ReferralDraft>,
  ): void {
    setDrafts((current: Record<string, ReferralDraft>) => ({
      ...current,
      [referralId]: {
        ...current[referralId],
        ...draft,
      },
    }));
  }

  /*
   * Save all changed referrals.
   */
  async function handleSaveChanges(): Promise<void> {
    if (!canUpdateStatus) {
      return;
    }

    const changedReferrals = referrals.filter((referral) =>
      hasReferralChanged(referral, drafts[referral.id]),
    );

    if (changedReferrals.length === 0) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const updated = await Promise.all(
        changedReferrals.map((referral) => {
          const draft = drafts[referral.id];

          return updateReferralStatus(referral.id, {
            status: draft.status,
            hiringOutcome: getOutcomeForStatus(draft.status),
            hiredAt: draft.hiredAt || null,
          });
        }),
      );

      setResponse(
        (
          current: PagedResponse<Referral> | null,
        ): PagedResponse<Referral> | null =>
          current
            ? {
                ...current,
                items: current.items.map(
                  (referral) =>
                    updated.find((item) => item.id === referral.id) ?? referral,
                ),
              }
            : current,
      );

      /*
       * Refresh drafts using the updated values.
       */
      setDrafts((current: Record<string, ReferralDraft>) => {
        const next = { ...current };

        updated.forEach((referral) => {
          next[referral.id] = {
            status: referral.status,
            hiredAt: referral.hiredAt ?? "",
          };
        });

        return next;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Referral changes could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * Clear all filters.
   */
  function clearFilters(): void {
    setSearch("");
    setSubmittedSearch("");
    setStatus("");
    setSubmittedFrom("");
    setSubmittedTo("");
    setPage(1);
  }

  const changedCount = referrals.filter((referral) =>
    hasReferralChanged(referral, drafts[referral.id]),
  ).length;

  const activeFilterCount = [
    submittedSearch,
    status,
    submittedFrom,
    submittedTo,
  ].filter(Boolean).length;

  const referralUpdateTitle = canUpdateStatus
    ? undefined
    : "Only recruiters and Talent Acquisition Managers can update referrals";

  return (
    <AppLayout title="Referrals">
      <PageContainer>
        <div className="referrals-page">
          {/* PAGE HEADER */}
          {/* <header className="referrals-header">
            <div className="referrals-header-content">
              <p className="referrals-eyebrow">Talent Acquisition</p>

              <h1>Employee Referrals</h1>

              <p className="referrals-subtitle">
                Review, track, and update candidates referred for open roles.
              </p>
            </div>

            <div className="referrals-header-stat">
              <span className="referrals-header-stat-label">
                Current results
              </span>

              <strong>{referrals.length}</strong>
            </div>
          </header> */}

          {/* FILTER BAR */}
          <section
            className="referral-filter-panel"
            aria-label="Referral filters"
          >
            <div className="filter-panel-top">
              <div className="filter-panel-title">
                <div className="filter-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 5h16M7 12h10M10 19h4" />
                  </svg>
                </div>

                <div>
                  <strong>Search &amp; filters</strong>

                  <span>
                    {activeFilterCount > 0
                      ? `${activeFilterCount} active filter${
                          activeFilterCount > 1 ? "s" : ""
                        }`
                      : "Find referrals quickly"}
                  </span>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  className="clear-filters-button"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="referral-filter-grid">
              {/* SEARCH */}
              <label className="referral-search-field">
                <span>Search</span>

                <div className="input-with-icon">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Candidate, referrer, or role"
                    aria-label="Search referrals"
                  />

                  {search.length > 0 && search.length < 3 && (
                    <span className="search-hint">3+ chars</span>
                  )}

                  {search.trim().length >= 3 && (
                    <span className="search-auto-label">Auto</span>
                  )}
                </div>
              </label>

              {/* STATUS */}
              <label>
                <span>Status</span>

                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>

                  {referralStatuses.map((item) => (
                    <option value={item} key={item}>
                      {formatValue(item)}
                    </option>
                  ))}
                </select>
              </label>

              {/* FROM */}
              <label>
                <span>Submitted from</span>

                <input
                  type="date"
                  value={submittedFrom}
                  onChange={(event) => {
                    setSubmittedFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </label>

              {/* TO */}
              <label>
                <span>Submitted to</span>

                <input
                  type="date"
                  value={submittedTo}
                  onChange={(event) => {
                    setSubmittedTo(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>

            {search.trim().length > 0 && search.trim().length < 3 && (
              <p className="filter-helper-text">
                Type at least 3 characters to search automatically.
              </p>
            )}
          </section>

          {/* ERROR */}
          {!isLoading && error && (
            <div className="referrals-error-wrapper">
              <ErrorState title="Referrals unavailable" message={error} />
            </div>
          )}

          {/* LOADING */}
          {isLoading && (
            <section className="referrals-loading">
              <LoadingState message="Loading referrals..." />
            </section>
          )}

          {/* EMPTY */}
          {!isLoading && !error && referrals.length === 0 && (
            <section className="referrals-empty">
              <div className="empty-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              </div>

              <strong>No referrals found</strong>

              <p>No referrals match your current search or filter criteria.</p>

              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </section>
          )}

          {/* TABLE */}
          {!isLoading && !error && referrals.length > 0 && (
            <section className="referral-table-panel">
              <div className="table-panel-header">
                <div>
                  <h2>Referral candidates</h2>

                  <span>
                    Showing {referrals.length} referral
                    {referrals.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {changedCount > 0 && (
                  <div className="unsaved-indicator">
                    <span />
                    {changedCount} unsaved change
                    {changedCount !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              <div className="referral-table-wrapper">
                <table className="referral-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Role</th>
                      <th>Referrer</th>
                      <th>Status</th>
                      <th>Resume</th>
                      <th>Submitted</th>
                      <th>Resumption date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {referrals.map((referral) => {
                      const draft = drafts[referral.id];
                      const hasChanged = hasReferralChanged(referral, draft);

                      return (
                        <tr
                          key={referral.id}
                          className={hasChanged ? "row-changed" : undefined}
                        >
                          {/* CANDIDATE */}
                          <td>
                            <div className="candidate-cell">
                              <div
                                className="candidate-avatar"
                                aria-hidden="true"
                              >
                                {getInitials(referral.candidateName)}
                              </div>

                              <div className="candidate-info">
                                <Link
                                  className="candidate-name"
                                  to={`/referrals/${referral.id}`}
                                >
                                  {referral.candidateName}
                                </Link>

                                <span>{referral.candidateEmail}</span>
                              </div>
                            </div>
                          </td>

                          {/* ROLE */}
                          <td>
                            <div className="role-cell">
                              <strong>{referral.roleAppliedFor}</strong>

                              <span>
                                {referral.requisitionCode}

                                <span className="cell-separator">•</span>

                                {formatValue(referral.department)}
                              </span>
                            </div>
                          </td>

                          {/* REFERRER */}
                          <td>
                            <div className="referrer-cell">
                              <strong>{referral.referrerName}</strong>

                              <span>{referral.referrerDepartment}</span>
                            </div>
                          </td>

                          {/* STATUS */}
                          <td>
                            <div className="status-cell">
                              <select
                                className={`referral-status-select ${getStatusClass(
                                  draft?.status ?? referral.status,
                                )}`}
                                value={draft?.status ?? referral.status}
                                disabled={!canUpdateStatus}
                                onChange={(event) => {
                                  const nextStatus = event.target.value;

                                  updateDraft(referral.id, {
                                    status: nextStatus,
                                    hiredAt:
                                      nextStatus === "Hired"
                                        ? draft?.hiredAt ||
                                          new Date().toISOString().slice(0, 10)
                                        : "",
                                  });
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

                              {hasChanged && (
                                <span
                                  className="changed-dot"
                                  title="Unsaved change"
                                />
                              )}
                            </div>
                          </td>

                          {/* RESUME */}
                          <td>
                            {referral.resumeUrl ? (
                              <a
                                className="resume-link"
                                href={referral.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="15"
                                  height="15"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  aria-hidden="true"
                                >
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <path d="M14 2v6h6M8 13h8M8 17h6" />
                                </svg>
                                View resume
                              </a>
                            ) : (
                              <span className="muted-cell">No resume</span>
                            )}
                          </td>

                          {/* SUBMITTED */}
                          <td>
                            <span className="date-cell">
                              {formatDate(referral.submissionDate)}
                            </span>
                          </td>

                          {/* RESUMPTION */}
                          <td>
                            <input
                              className="date-input"
                              type="date"
                              value={draft?.hiredAt ?? ""}
                              disabled={!canUpdateStatus}
                              onChange={(event) =>
                                updateDraft(referral.id, {
                                  hiredAt: event.target.value,
                                })
                              }
                              aria-label={`Resumption date for ${referral.candidateName}`}
                              title={referralUpdateTitle}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SAVE BAR */}
              <div className="table-save-bar">
                <div className="save-status">
                  {changedCount > 0 ? (
                    <>
                      <span className="save-status-dot" />

                      <span>
                        You have {changedCount} unsaved change
                        {changedCount !== 1 ? "s" : ""}
                      </span>
                    </>
                  ) : (
                    <span>All changes saved</span>
                  )}
                </div>

                <button
                  className="save-referrals-button"
                  type="button"
                  disabled={!canUpdateStatus || isSaving || changedCount === 0}
                  onClick={handleSaveChanges}
                  title={referralUpdateTitle}
                >
                  {isSaving ? (
                    <>
                      <span className="button-spinner" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>

              {/* PAGINATION */}
              {response && (
                <div className="pagination-bar">
                  <span>
                    Page {response.pagination.page} of{" "}
                    {response.pagination.totalPages}
                  </span>

                  <div className="pagination-buttons">
                    <button
                      type="button"
                      disabled={!response.pagination.hasPreviousPage}
                      onClick={() =>
                        setPage((current: number) => Math.max(1, current - 1))
                      }
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={!response.pagination.hasNextPage}
                      onClick={() => setPage((current: number) => current + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

function getOutcomeForStatus(status: string): string {
  if (status === "Hired") {
    return "Hired";
  }

  if (status === "Rejected" || status === "Ineligible") {
    return "NotHired";
  }

  if (status === "Withdrawn") {
    return "Withdrawn";
  }

  return "Pending";
}

function hasReferralChanged(
  referral: Referral,
  draft?: ReferralDraft,
): boolean {
  if (!draft) {
    return false;
  }

  return (
    draft.status !== referral.status ||
    draft.hiredAt !== (referral.hiredAt ?? "")
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getStatusClass(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
}

function readStoredReferralFilters(): ReferralFilters {
  const fallback: ReferralFilters = {
    search: "",
    status: "",
    submittedFrom: "",
    submittedTo: "",
  };

  try {
    const stored = localStorage.getItem(referralFilterStorageKey);

    if (!stored) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(stored);

    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    const filters = parsed as Partial<ReferralFilters>;

    return {
      search:
        typeof filters.search === "string" ? filters.search : fallback.search,
      status:
        typeof filters.status === "string" ? filters.status : fallback.status,
      submittedFrom:
        typeof filters.submittedFrom === "string"
          ? filters.submittedFrom
          : fallback.submittedFrom,
      submittedTo:
        typeof filters.submittedTo === "string"
          ? filters.submittedTo
          : fallback.submittedTo,
    };
  } catch {
    return fallback;
  }
}
