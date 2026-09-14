import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  FileText,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { useAuth } from "../features/auth/authContext";
import { canReassignRecruiter } from "../features/auth/roleAccess";
import {
  createRequisition,
  getRequisition,
  updateRequisition,
} from "../features/requisitions/requisitionApi";
import {
  formatValue,
  openingReasons,
  postingTypes,
  recruitmentTeams,
  requisitionPriorities,
  requisitionStatuses,
} from "../features/requisitions/requisitionDisplay";
import type { Requisition } from "../features/requisitions/requisitionTypes";
import { getUsers } from "../features/users/userApi";
import type { UserSummary } from "../features/users/userTypes";
import "../styles/RequisitionFormPage.css";
import { ApiError, apiRequest } from "../lib/apiClient";
import { useToast } from "../components/feedback/toastContext";
import { Tooltip } from "../components/common/Tooltip";

export function RequisitionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditing = Boolean(id);
  const canReassign = canReassignRecruiter(user);

  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [recruiters, setRecruiters] = useState<UserSummary[]>([]);
  const [hiringManagers, setHiringManagers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openingReason, setOpeningReason] = useState("Other");
  const [requisitionCode, setRequisitionCode] = useState('');
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function loadFormData() {
      setIsLoading(true);
      setError("");

      try {
        const [recruiterList, taManagerList, hiringManagerList, current] =
          await Promise.all([
            getUsers({ role: "Recruiter", pageSize: 100 }),
            getUsers({
              role: "TalentAcquisitionManager",
              pageSize: 100,
            }),
            getUsers({
              role: "HiringManager",
              pageSize: 100,
            }),
            id ? getRequisition(id) : Promise.resolve(null),
          ]);

        if (!isMounted) {
          return;
        }

        setRecruiters(
          uniqueUsers([...recruiterList.items, ...taManagerList.items]),
        );

        setHiringManagers(hiringManagerList.items);
        setRequisition(current);
        setOpeningReason(current?.openingReason ?? "Other");
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Form data could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFormData();

    return () => {
      isMounted = false;
    };
  }, [id]);

useEffect(() => {
  if (isEditing) return;
  let isMounted = true;

  const fetchNextCode = async () => {
    setIsCodeLoading(true);
    setCodeError("");

    try {
      const data = await apiRequest<{requisitionCode: string}> ("/api/requisitions/next-code",);
      if (isMounted) setRequisitionCode(data.requisitionCode)

    } catch (err) {
      console.error("failed to fetch code", err)
      if (isMounted) {
        setCodeError(err instanceof ApiError ? err.message : "Couldn't autogenerate a code, manually enter one")
      }
    } finally {
      if (isMounted) setIsCodeLoading(false)
    }
  };

  fetchNextCode();
  return () => {
    isMounted = false
  }
}, [isEditing]);


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roleName = value(form, "roleName");
    const department = value(form, "department");
    const hiringManagerUserId = value(form, "hiringManagerUserId");
    const recruiterUserId = value(form, "recruiterUserId");

    if (!roleName || !department || !hiringManagerUserId || !recruiterUserId) {
      setError("Complete all required fields before saving.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const request = {
        roleName,
        department,
        hiringManagerUserId,
        recruiterUserId,
        priority: value(form, "priority") || "Medium",
        dateOpened:
          value(form, "dateOpened") || new Date().toISOString().slice(0, 10),
        hiringGoal: Number(value(form, "hiringGoal") || 1),
        openingReason: value(form, "openingReason") || "Other",
        customOpeningReason: nullableValue(form.get("customOpeningReason")),
        postingType: value(form, "postingType") || "External",
        statusComment: nullableValue(form.get("statusComment")),
        hiringManagerNotes: nullableValue(form.get("hiringManagerNotes")),
      };

      const saved =
        isEditing && id
          ? await updateRequisition(id, {
              ...request,
              filledGoal: Number(value(form, "filledGoal") || 0),
              currentStatus: value(form, "currentStatus") || "Active",
              closedDate: nullableValue(form.get("closedDate")),
            })
          : await createRequisition({
              ...request,
              requisitionCode: value(form, "requisitionCode"),
            });

      navigate(`/requisitions/${saved.id}`);
      showToast(isEditing ? "Requisition updated" : "Requisition created.", "success")
    } catch (err) {
        const message = err instanceof Error ? err.message : "Requisition could not be saved."
      setError(message)
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout title={isEditing ? "Edit Requisition" : "New Requisition"}>
      <PageContainer>
        <div className="requisition-form-page">
          <Link
            className="requisition-back-link"
            to={id ? `/requisitions/${id}` : "/requisitions"}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span>Back to requisitions</span>
          </Link>

          <header className="requisition-form-header">
            <div className="requisition-form-heading">
              <div className="requisition-form-icon">
                <BriefcaseBusiness size={23} aria-hidden="true" />
              </div>

              <div>
                <p className="requisition-eyebrow">Recruitment</p>

                <h1>
                  {isEditing ? "Edit requisition" : "Create a new requisition"}
                </h1>

                <p>
                  {isEditing
                    ? "Update the role, ownership, hiring targets and recruitment details."
                    : "Set up a new hiring request and assign the people responsible for filling it."}
                </p>
              </div>
            </div>

            {isEditing && requisition && (
              <div className="requisition-code-badge">
                <span>Requisition</span>
                <strong>{requisition.requisitionCode}</strong>
              </div>
            )}
          </header>

          {isLoading && (
            <section className="requisition-form-state">
              <LoadingState branded message="Loading requisition form" />
            </section>
          )}

          {!isLoading &&
            error &&
            !recruiters.length &&
            !hiringManagers.length && (
              <div className="requisition-form-state">
                <ErrorState title="Form unavailable" message={error} />
              </div>
            )}

          {!isLoading && recruiters.length > 0 && hiringManagers.length > 0 && (
            <form className="requisition-form" onSubmit={handleSubmit}>
              {!isEditing && (
                <section className="form-section">
                  <SectionHeader
                    icon={<FileText size={19} />}
                    eyebrow="Identification"
                    title="Requisition details"
                    description="Give this hiring request a unique reference."
                  />

                  <div className="form-grid form-grid-single">
                    <Field
                      label="Requisition code"
                      required
                      hint={codeError}
                    >
                      <input
                        name="requisitionCode"
                        value={requisitionCode}
                        readOnly
                        required
                        placeholder={isCodeLoading ? "Generating.." : "e.g. REQ-2026-001"}
                      />
                    </Field>
                  </div>
                </section>
              )}

              <section className="form-section">
                <SectionHeader
                  icon={<BriefcaseBusiness size={19} />}
                  eyebrow="Role information"
                  title="Position details"
                  description="Define the position and the main requirements for the hiring request."
                />

                <div className="form-grid">
                  <Field label="Role name" required>
                    <input
                      name="roleName"
                      defaultValue={requisition?.roleName}
                      required
                      placeholder="e.g. Senior Product Designer"
                    />
                  </Field>

                  <Field label="Team" required>
                    <Select
                      name="department"
                      options={recruitmentTeams}
                      defaultValue={requisition?.department ?? "Talent"}
                    />
                  </Field>

                  <Field label="Hiring manager" required>
                    <UserSelect
                      name="hiringManagerUserId"
                      users={hiringManagers}
                      defaultValue={requisition?.hiringManagerUserId}
                    />
                  </Field>

                  <Field
                    label="Recruiter"
                    required
                    tooltip={
                      isEditing && !canReassign
                        ? "Only Talent Acquisition Managers can change the recruiter."
                        : undefined
                    }
                  >
                    <UserSelect
                      name="recruiterUserId"
                      users={recruiters}
                      defaultValue={
                        requisition?.recruiterUserId ??
                        (!canReassign ? user?.id : undefined)
                      }
                      disabled={isEditing && !canReassign}
                    />

                    {isEditing && !canReassign && (
                      <input
                        type="hidden"
                        name="recruiterUserId"
                        value={requisition?.recruiterUserId ?? ""}
                      />
                    )}
                  </Field>

                  <Field label="Priority" required>
                    <Select
                      name="priority"
                      options={requisitionPriorities}
                      defaultValue={requisition?.priority ?? "Medium"}
                    />
                  </Field>

                  <Field label="Posting type" required>
                    <Select
                      name="postingType"
                      options={postingTypes}
                      defaultValue={requisition?.postingType ?? "External"}
                    />
                  </Field>
                </div>
              </section>

              <section className="form-section">
                <SectionHeader
                  icon={<Users size={19} />}
                  eyebrow="Hiring plan"
                  title="Hiring targets"
                  description="Set the timeline and number of people you intend to hire."
                />

                <div className="form-grid">
                  <Field label="Date opened" required>
                    <input
                      name="dateOpened"
                      type="date"
                      required
                      defaultValue={
                        requisition?.dateOpened ??
                        new Date().toISOString().slice(0, 10)
                      }
                    />
                  </Field>

                  <Field
                    label="Hiring goal"
                    required
                    hint="Number of people to hire."
                  >
                    <input
                      name="hiringGoal"
                      type="number"
                      min="1"
                      required
                      defaultValue={requisition?.hiringGoal ?? 1}
                    />
                  </Field>

                  {isEditing && (
                    <>
                      <Field label="Filled goal" hint="Number already hired.">
                        <input
                          name="filledGoal"
                          type="number"
                          min="0"
                          defaultValue={requisition?.filledGoal ?? 0}
                        />
                      </Field>

                      <Field label="Status">
                        <Select
                          name="currentStatus"
                          options={requisitionStatuses}
                          defaultValue={requisition?.currentStatus ?? "Active"}
                        />
                      </Field>

                      <Field label="Closed date">
                        <input
                          name="closedDate"
                          type="date"
                          defaultValue={requisition?.closedDate ?? ""}
                        />
                      </Field>
                    </>
                  )}

                  <Field label="Opening reason">
                    <Select
                      name="openingReason"
                      options={openingReasons}
                      defaultValue={requisition?.openingReason ?? "Other"}
                      onChange={setOpeningReason}
                    />
                  </Field>

                  {openingReason === "Other" && (
                    <Field label="Custom reason">
                      <input
                        name="customOpeningReason"
                        defaultValue={requisition?.customOpeningReason ?? ""}
                        placeholder="Describe the reason for opening this role"
                      />
                    </Field>
                  )}
                </div>
              </section>

              <section className="form-section">
                <SectionHeader
                  icon={<FileText size={19} />}
                  eyebrow="Additional information"
                  title="Notes & comments"
                  description="Add context that will help the hiring team manage this requisition."
                />

                <div className="form-grid form-grid-single">
                  <Field
                    label="Status comment"
                    hint="Optional update about the current state of the requisition."
                  >
                    <textarea
                      name="statusComment"
                      rows={4}
                      defaultValue={requisition?.statusComment ?? ""}
                      placeholder="Add a status update..."
                    />
                  </Field>

                  <Field
                    label="Hiring manager notes"
                    hint="Optional notes for the hiring team."
                  >
                    <textarea
                      name="hiringManagerNotes"
                      rows={4}
                      defaultValue={requisition?.hiringManagerNotes ?? ""}
                      placeholder="Add hiring manager notes..."
                    />
                  </Field>
                </div>
              </section>

              {error && (
                <div className="form-error-box" role="alert">
                  <strong>Unable to save requisition</strong>
                  <span>{error}</span>
                </div>
              )}

              <div className="form-actions">
                <Link
                  className="form-cancel-button"
                  to={id ? `/requisitions/${id}` : "/requisitions"}
                >
                  Cancel
                </Link>

                <button
                  className="form-save-button"
                  type="submit"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting
                      ? "Saving..."
                      : isEditing
                        ? "Save changes"
                        : "Create requisition"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="form-section-header">
      <div className="form-section-icon">{icon}</div>

      <div>
        <span className="form-section-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  hint,
  tooltip,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  tooltip?: string
  children: React.ReactNode;
}) {
  return (
    <div className="form-field">
      <label>
        <span className="form-field-label">
          {label}
          {required && (
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          )}
          {tooltip && <Tooltip text={tooltip} />}
        </span>

        {children}
      </label>

      {hint && <span className="form-field-hint">{hint}</span>}
    </div>
  );
}

function UserSelect({
  defaultValue,
  disabled = false,
  name,
  users,
}: {
  defaultValue?: string;
  disabled?: boolean;
  name: string;
  users: UserSummary[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      disabled={disabled}
      required
    >
      <option value="">Select user</option>

      {users.map((user) => (
        <option value={user.id} key={user.id}>
          {user.fullName}
        </option>
      ))}
    </select>
  );
}

function Select({
  defaultValue,
  name,
  onChange,
  options,
}: {
  defaultValue?: string;
  name: string;
  onChange?: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option value={option} key={option}>
          {formatValue(option)}
        </option>
      ))}
    </select>
  );
}

function uniqueUsers(users: UserSummary[]) {
  return [...new Map(users.map((user) => [user.id, user])).values()].sort(
    (left, right) => left.fullName.localeCompare(right.fullName),
  );
}

function value(form: FormData, key: string) {
  return form.get(key)?.toString().trim() ?? "";
}

function nullableValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : null;
}
