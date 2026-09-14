import { type FormEvent, useEffect, useRef, useState } from "react";
import { Eye, Pencil, UserRoundCog } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { useToast } from "../components/feedback/useToast";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { useAuth } from "../features/auth/authContext";
import {
  canReassignRecruiter,
  canUseRecruitmentWrite,
} from "../features/auth/roleAccess";
import {
  getRequisitions,
  reassignRequisitionRecruiter,
} from "../features/requisitions/requisitionApi";
import {
  formatValue,
  pipelineStages,
  requisitionStatuses,
} from "../features/requisitions/requisitionDisplay";
import type { Requisition } from "../features/requisitions/requisitionTypes";
import { getUsers } from "../features/users/userApi";
import type { UserSummary } from "../features/users/userTypes";
import type { PagedResponse } from "../lib/paginationTypes";

import "../styles/Requisitions.css";

export function RequisitionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const canWrite = canUseRecruitmentWrite(user);
  const canReassign = canReassignRecruiter(user);
  const initialSearch = searchParams.get("search") ?? "";
  const [response, setResponse] = useState<PagedResponse<Requisition> | null>(
    null,
  );
  const [search, setSearch] = useState(initialSearch);
  const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
  const [openOnly, setOpenOnly] = useState(
    getBooleanParam(searchParams, "openOnly", false),
  );
  const [overdueOnly, setOverdueOnly] = useState(
    getBooleanParam(searchParams, "overdueOnly", false),
  );
  const [nearSlaBreach, setNearSlaBreach] = useState(
    getBooleanParam(searchParams, "nearSlaBreach", false),
  );
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [stage, setStage] = useState(searchParams.get("stage") ?? "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reassigning, setReassigning] = useState<Requisition | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = search.trim();

    if (term.length > 0 && term.length < 3) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPage(1);
      setSubmittedSearch(term);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let isMounted = true;

    async function loadRequisitions() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getRequisitions({
          page,
          pageSize: 10,
          search: submittedSearch.trim(),
          openOnly,
          overdueOnly,
          nearSlaBreach,
          status,
          stage,
        });

        if (!isMounted) {
          return;
        }

        setResponse(data);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Requisitions could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRequisitions();

    return () => {
      isMounted = false;
    };
  }, [
    page,
    submittedSearch,
    openOnly,
    overdueOnly,
    nearSlaBreach,
    status,
    stage,
  ]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = search.trim();
    setPage(1);
    setSubmittedSearch(term);
  }

  function handleFilterChange(update: () => void) {
    setPage(1);
    update();
  }

  function clearRequisitionFilters() {
    setPage(1);
    setOpenOnly(false);
    setNearSlaBreach(false);
    setOverdueOnly(false);
    setStatus("");
    setStage("");
    setIsFilterOpen(false);
  }

  const selectedFilterCount = [
    openOnly,
    nearSlaBreach,
    overdueOnly,
    Boolean(status),
    Boolean(stage),
  ].filter(Boolean).length;

  return (
    <AppLayout title="Requisitions">
      <PageContainer>
        <div className="requisitions-page">
          <section className="list-toolbar">
            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search role, team, recruiter..."
                aria-label="Search requisitions"
              />
            </form>

            <div className="filter-menu" ref={filterRef}>
              <button
                type="button"
                className="filter-menu-button"
                aria-expanded={isFilterOpen}
                aria-haspopup="true"
                onClick={() => setIsFilterOpen((current) => !current)}
              >
                <span className="filter-button-icon" aria-hidden="true">
                  ☷
                </span>

                <span>Filters</span>

                {selectedFilterCount > 0 && (
                  <span className="filter-count">{selectedFilterCount}</span>
                )}
              </button>

              {isFilterOpen && (
                <div
                  className="filter-menu-panel"
                  aria-label="Requisition filters"
                >
                  <div className="filter-panel-header">
                    <div>
                      <strong>Filter requisitions</strong>
                      <span>Narrow down your recruitment pipeline</span>
                    </div>

                    {selectedFilterCount > 0 && (
                      <button
                        type="button"
                        className="clear-filters-button"
                        onClick={clearRequisitionFilters}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="filter-panel-body">
                    <label className="filter-field">
                      <span>Status</span>

                      <select
                        value={status}
                        onChange={(event) =>
                          handleFilterChange(() =>
                            setStatus(event.target.value),
                          )
                        }
                      >
                        <option value="">All statuses</option>

                        {requisitionStatuses.map((item) => (
                          <option value={item} key={item}>
                            {formatValue(item)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="filter-field">
                      <span>Stage</span>

                      <select
                        value={stage}
                        onChange={(event) =>
                          handleFilterChange(() => setStage(event.target.value))
                        }
                      >
                        <option value="">All stages</option>

                        {pipelineStages.map((item) => (
                          <option value={item} key={item}>
                            {formatValue(item)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="filter-divider" />

                    <label className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={openOnly}
                        onChange={(event) =>
                          handleFilterChange(() =>
                            setOpenOnly(event.target.checked),
                          )
                        }
                      />

                      <span className="custom-checkbox" />

                      <span>
                        <strong>Open requisitions</strong>
                        <small>Show only currently open roles</small>
                      </span>
                    </label>

                    <label className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={nearSlaBreach}
                        onChange={(event) =>
                          handleFilterChange(() =>
                            setNearSlaBreach(event.target.checked),
                          )
                        }
                      />

                      <span className="custom-checkbox" />

                      <span>
                        <strong>Near SLA breach</strong>
                        <small>Roles approaching their SLA limit</small>
                      </span>
                    </label>

                    <label className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={overdueOnly}
                        onChange={(event) =>
                          handleFilterChange(() =>
                            setOverdueOnly(event.target.checked),
                          )
                        }
                      />

                      <span className="custom-checkbox" />

                      <span>
                        <strong>Overdue requisitions</strong>
                        <small>Roles that have exceeded their SLA</small>
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {canWrite ? (
              <Link className="action-link" to="/requisitions/new">
                <span aria-hidden="true">+</span>
                New requisition
              </Link>
            ) : (
              <button
                className="action-link"
                type="button"
                disabled
                title="Only recruiters and Talent Acquisition Managers can create requisitions"
              >
                <span aria-hidden="true">+</span>
                New requisition
              </button>
            )}
          </section>

          {isLoading && (
            <div className="requisitions-state-wrapper">
              <LoadingState message="Loading requisitions..." />
            </div>
          )}

          {!isLoading && error && (
            <div className="requisitions-state-wrapper">
              <ErrorState title="Requisitions unavailable" message={error} />
            </div>
          )}

          {!isLoading && !error && response?.items.length === 0 && (
            <section className="empty-panel centered-empty-panel">
              <div className="empty-icon" aria-hidden="true">
                <span>⌕</span>
              </div>

              <strong>No requisitions found</strong>

              <p>
                No requisitions match the current filters. Try changing your
                search or filters.
              </p>

              {selectedFilterCount > 0 && (
                <button
                  type="button"
                  className="empty-clear-button"
                  onClick={clearRequisitionFilters}
                >
                  Clear filters
                </button>
              )}
            </section>
          )}

          {!isLoading && !error && response && response.items.length > 0 && (
            <section className="table-panel" aria-label="Requisitions list">
              <div className="table-header">
                <div>
                  <h2>All requisitions</h2>

                  <span>
                    {response.items.length}{" "}
                    {response.items.length === 1
                      ? "requisition"
                      : "requisitions"}{" "}
                    shown
                  </span>
                </div>

                {selectedFilterCount > 0 && (
                  <button
                    type="button"
                    className="table-clear-filter"
                    onClick={clearRequisitionFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="table-scroll">
                <table className="requisition-table">
                  <thead>
                    <tr>
                      <th scope="col">Role</th>
                      <th scope="col">Recruiter</th>
                      <th scope="col">Status</th>
                      <th scope="col">Stage</th>
                      <th scope="col">Priority</th>
                      <th scope="col">SLA</th>
                      <th scope="col">Progress</th>
                      <th scope="col" className="actions-column">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {response.items.map((requisition) => (
                      <tr key={requisition.id}>
                        <td className="role-cell">
                          <Link
                            className="table-row-title"
                            to={`/requisitions/${requisition.id}`}
                          >
                            {requisition.roleName}
                          </Link>

                          <span className="secondary-cell-text">
                            {requisition.requisitionCode}
                            <span className="cell-separator">•</span>
                            {formatValue(requisition.department)}
                          </span>
                        </td>

                        <td>
                          <div className="recruiter-cell">
                            <div className="avatar">
                              {getInitials(requisition.recruiter)}
                            </div>

                            <strong>{requisition.recruiter}</strong>
                          </div>
                        </td>

                        <td>
                          <span className="status-text">
                            {formatValue(requisition.currentStatus)}
                          </span>
                        </td>

                        <td>
                          <span className="stage-text">
                            {formatValue(requisition.currentStage)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`priority-pill ${requisition.priority.toLowerCase()}`}
                          >
                            {formatValue(requisition.priority)}
                          </span>
                        </td>

                        <td>
                          <div className="sla-cell">
                            <span
                              className={`sla-pill ${requisition.slaState.toLowerCase()}`}
                            >
                              {formatValue(requisition.slaState)}
                            </span>

                            <span
                              className={`days-open ${requisition.slaState.toLowerCase()}`}
                            >
                              {requisition.daysOpen} days open
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="progress-cell">
                            <div className="progress-numbers">
                              <strong>
                                {requisition.filledGoal}/
                                {requisition.hiringGoal}
                              </strong>

                              <span>{requisition.remainingGoal} remaining</span>
                            </div>

                            <div
                              className="progress-track"
                              aria-label={`${requisition.filledGoal} of ${requisition.hiringGoal} positions filled`}
                            >
                              <span
                                className="progress-value"
                                style={{
                                  width: `${getProgressPercentage(
                                    requisition.filledGoal,
                                    requisition.hiringGoal,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="icon-actions">
                            <Link
                              to={`/requisitions/${requisition.id}`}
                              title="View requisition"
                              aria-label={`View ${requisition.roleName}`}
                            >
                              <Eye
                                size={16}
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            </Link>

                            {canWrite ? (
                              <Link
                                to={`/requisitions/${requisition.id}/edit`}
                                title="Edit requisition"
                                aria-label={`Edit ${requisition.roleName}`}
                              >
                                <Pencil
                                  size={16}
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Only recruiters and Talent Acquisition Managers can edit requisitions"
                                aria-label={`Edit ${requisition.roleName}`}
                              >
                                <Pencil
                                  size={16}
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                              </button>
                            )}

                            {canReassign ? (
                              <button
                                type="button"
                                title="Reassign recruiter"
                                aria-label={`Reassign recruiter for ${requisition.roleName}`}
                                onClick={() => setReassigning(requisition)}
                              >
                                <UserRoundCog
                                  size={16}
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Only Talent Acquisition Managers can reassign recruiters"
                                aria-label={`Reassign recruiter for ${requisition.roleName}`}
                              >
                                <UserRoundCog
                                  size={16}
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-table-hint">
                <span aria-hidden="true">↔</span>
                Swipe horizontally to view all columns
              </div>

              <div className="pagination-bar">
                <span className="pagination-summary">
                  Page <strong>{response.pagination.page}</strong> of{" "}
                  <strong>{response.pagination.totalPages}</strong>
                </span>

                <div className="pagination-controls">
                  <button
                    type="button"
                    disabled={!response.pagination.hasPreviousPage}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    <span aria-hidden="true">←</span>
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!response.pagination.hasNextPage}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {reassigning && (
            <ReassignRecruiterModal
              onClose={() => setReassigning(null)}
              onSaved={(updated) => {
                setResponse((current) =>
                  current
                    ? {
                        ...current,
                        items: current.items.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      }
                    : current,
                );

                setReassigning(null);
              }}
              requisition={reassigning}
            />
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

function ReassignRecruiterModal({
  onClose,
  onSaved,
  requisition,
}: {
  onClose: () => void;
  onSaved: (requisition: Requisition) => void;
  requisition: Requisition;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [selectedRecruiter, setSelectedRecruiter] =
    useState<UserSummary | null>(null);
  const { showToast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = search.trim();

    if (selectedRecruiter || term.length < 3) {
      setResults([]);
      return;
    }

    let isMounted = true;

    async function searchRecruiters() {
      setIsSearching(true);
      setError("");

      try {
        const [recruiters, managers] = await Promise.all([
          getUsers({
            role: "Recruiter",
            search: term,
            pageSize: 20,
          }),

          getUsers({
            role: "TalentAcquisitionManager",
            search: term,
            pageSize: 20,
          }),
        ]);

        if (isMounted) {
          setResults(uniqueUsers([...recruiters.items, ...managers.items]));
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Recruiter search failed.",
          );
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }

    void searchRecruiters();

    return () => {
      isMounted = false;
    };
  }, [search, selectedRecruiter]);

  async function handleSave() {
    if (!selectedRecruiter) {
      setError("Select a recruiter.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const updated = await reassignRequisitionRecruiter(requisition.id, {
        recruiterUserId: selectedRecruiter.id,
      });

      onSaved(updated);
      showToast("Recruiter reassigned", "success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Recruiter could not be reassigned.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="modal-panel"
        aria-modal="true"
        role="dialog"
        aria-labelledby="reassign-recruiter-title"
      >
        <div className="modal-heading">
          <div className="modal-title-area">
            <div className="modal-icon" aria-hidden="true">
              <UserRoundCog size={19} />
            </div>

            <div>
              <h2 id="reassign-recruiter-title">Reassign recruiter</h2>

              <p>Assign a new recruiter to this requisition.</p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="reassign-current">
          <span>Current recruiter</span>

          <strong>{requisition.recruiter}</strong>
        </div>

        <div className="inline-form">
          <label>
            <span>New recruiter</span>

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedRecruiter(null);
                setError("");
              }}
              placeholder="Search by recruiter name..."
              autoFocus
            />
          </label>

          <div className="search-picker">
            {isSearching && (
              <div className="picker-message">
                <span className="mini-spinner" />
                Searching recruiters...
              </div>
            )}

            {!selectedRecruiter &&
              search.trim().length > 0 &&
              search.trim().length < 3 && (
                <div className="picker-message">
                  Enter at least 3 characters.
                </div>
              )}

            {!selectedRecruiter &&
              !isSearching &&
              search.trim().length >= 3 &&
              results.length === 0 && (
                <div className="picker-message">
                  No matching recruiters found.
                </div>
              )}

            {results.map((recruiter) => (
              <button
                type="button"
                key={recruiter.id}
                className="recruiter-result"
                onClick={() => {
                  setSelectedRecruiter(recruiter);
                  setSearch(recruiter.fullName);
                  setResults([]);
                }}
              >
                <div className="avatar recruiter-result-avatar">
                  {getInitials(recruiter.fullName)}
                </div>

                <div>
                  <strong>{recruiter.fullName}</strong>
                  <span>{recruiter.department ?? "Recruiting"}</span>
                </div>

                <span className="result-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}

            {selectedRecruiter && (
              <div className="selected-recruiter">
                <div className="selected-recruiter-info">
                  <div className="avatar">
                    {getInitials(selectedRecruiter.fullName)}
                  </div>

                  <div>
                    <strong>{selectedRecruiter.fullName}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="inline-form-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving || !selectedRecruiter}
              onClick={handleSave}
            >
              {isSaving ? (
                <>
                  <span className="button-spinner" />
                  Saving...
                </>
              ) : (
                "Save assignment"
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function getBooleanParam(
  searchParams: URLSearchParams,
  key: string,
  fallback: boolean,
) {
  const value = searchParams.get(key);

  if (value === null) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function uniqueUsers(users: UserSummary[]) {
  return [...new Map(users.map((user) => [user.id, user])).values()].sort(
    (left, right) => left.fullName.localeCompare(right.fullName),
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getProgressPercentage(filled: number, goal: number) {
  if (!goal || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (filled / goal) * 100));
}
