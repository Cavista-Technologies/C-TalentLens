import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  History,
  ListChecks,
  Plus,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { ErrorState, LoadingState } from "../components/feedback/StateMessage";
import { AppLayout } from "../components/layout/AppLayout";
import { PageContainer } from "../components/layout/PageContainer";
import { useAuth } from "../features/auth/authContext";
import { canUseRecruitmentWrite } from "../features/auth/roleAccess";
import {
  addActionItem,
  addBottleneck,
  completeActionItem,
  getRequisition,
  resolveBottleneck,
  updateRequisitionStage,
} from "../features/requisitions/requisitionApi";
import {
  actionCategories,
  actionPriorities,
  bottleneckCategories,
  bottleneckPriorities,
  formatDate,
  formatDateTime,
  formatValue,
  pipelineStages,
} from "../features/requisitions/requisitionDisplay";
import type {
  ActionItem,
  Bottleneck,
  Requisition,
  StageTransition,
} from "../features/requisitions/requisitionTypes";
import "../styles/RequisitionDetailPage.css";

type OwnerOption = {
  id: string;
  name: string;
};

type RequisitionDetailSection =
  | "overview"
  | "bottlenecks"
  | "actions"
  | "history";

const requisitionSections: Array<{
  id: RequisitionDetailSection;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "overview",
    label: "Overview",
    description: "Role and hiring progress",
    icon: <FileText size={18} />,
  },
  {
    id: "bottlenecks",
    label: "Bottlenecks",
    description: "Open blockers and owners",
    icon: <AlertTriangle size={18} />,
  },
  {
    id: "actions",
    label: "Actions",
    description: "Follow-ups and due dates",
    icon: <ListChecks size={18} />,
  },
  {
    id: "history",
    label: "Stage History",
    description: "Pipeline movement",
    icon: <History size={18} />,
  },
];

export function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const requestedSection = toRequisitionSection(searchParams.get("section"));
  const requestedAdd = searchParams.get("add");

  useEffect(() => {
    let isMounted = true;

    async function loadRequisition() {
      if (!id) {
        setError("Requisition was not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await getRequisition(id);

        if (!isMounted) {
          return;
        }

        setRequisition(data);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Requisition could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRequisition();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <AppLayout title="Requisition Detail">
      <PageContainer>
        <Link className="requisition-back-link" to="/requisitions">
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Back to requisitions</span>
        </Link>

        {isLoading && (
          <section className="requisition-loading">
            <LoadingState message="Loading requisition..." />
          </section>
        )}

        {!isLoading && error && (
          <section className="requisition-error">
            <ErrorState title="Requisition unavailable" message={error} />
          </section>
        )}

        {!isLoading && requisition && (
          <RequisitionDetail
            initialAddAction={requestedAdd === "action"}
            initialAddBottleneck={requestedAdd === "bottleneck"}
            initialSection={requestedSection}
            onChanged={setRequisition}
            requisition={requisition}
          />
        )}
      </PageContainer>
    </AppLayout>
  );
}

function RequisitionDetail({
  initialAddAction,
  initialAddBottleneck,
  initialSection,
  onChanged,
  requisition,
}: {
  initialAddAction: boolean;
  initialAddBottleneck: boolean;
  initialSection: RequisitionDetailSection;
  onChanged: (requisition: Requisition) => void;
  requisition: Requisition;
}) {
  const { user } = useAuth();
  const canWrite = canUseRecruitmentWrite(user);

  const [activeSection, setActiveSection] =
    useState<RequisitionDetailSection>(initialSection);

  const [isAddingBottleneck, setIsAddingBottleneck] =
    useState(initialAddBottleneck);

  const [isAddingAction, setIsAddingAction] = useState(initialAddAction);

  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [stageError, setStageError] = useState("");

  const openBottlenecks = requisition.bottlenecks.filter(
    (bottleneck) => bottleneck.status !== "Resolved",
  );

  const openActions = requisition.actionItems.filter(
    (action) => action.status !== "Completed",
  );

  const ownerOptions = [
    {
      id: requisition.recruiterUserId,
      name: requisition.recruiter,
    },
    {
      id: requisition.hiringManagerUserId,
      name: requisition.hiringManager,
    },
  ];

  const progressPercentage =
    requisition.hiringGoal > 0
      ? Math.min(
          100,
          Math.round((requisition.filledGoal / requisition.hiringGoal) * 100),
        )
      : 0;

  async function reload() {
    onChanged(await getRequisition(requisition.id));
  }

  async function handleBottleneckCreated() {
    setIsAddingBottleneck(false);
    await reload();
  }

  async function handleActionCreated() {
    setIsAddingAction(false);
    await reload();
  }

  async function handleStageChange(event: ChangeEvent<HTMLSelectElement>) {
    const stage = event.target.value;
    setIsUpdatingStage(true);
    setStageError("");

    try {
      const updated = await updateRequisitionStage(requisition.id, {
        stage,
        effectiveDate: null,
      });
      onChanged(updated);
    } catch (err) {
      setStageError(
        err instanceof Error ? err.message : "Stage could not be updated.",
      );
    } finally {
      setIsUpdatingStage(false);
    }
  }

  return (
    <>
      <section className="requisition-detail-hero">
        <div className="hero-main">
          <div className="hero-code">{requisition.requisitionCode}</div>

          <h1>{requisition.roleName}</h1>

          <div className="hero-meta">
            <span>
              <CircleDot size={15} />
              {formatValue(requisition.department)}
            </span>

            <span>
              <UserRound size={15} />
              {requisition.recruiter}
            </span>

            <span>
              <CalendarDays size={15} />
              Opened {formatDate(requisition.dateOpened)}
            </span>
          </div>
        </div>

        <div className="hero-status-area">
          <div className="hero-status-label">Current status</div>

          <div className="hero-statuses">
            <div className="status-field">
              <span className="status-field-label">Status</span>
              <span
                className={`detail-status-pill ${requisition.currentStatus.toLowerCase()}`}
              >
                {formatValue(requisition.currentStatus)}
              </span>
            </div>

            <div className="status-field">
              <span className="status-field-label">Stage</span>
              {canWrite ? (
                <select
                  className="stage-select"
                  value={requisition.currentStage}
                  onChange={handleStageChange}
                  disabled={isUpdatingStage}
                  aria-label="Pipeline stage"
                >
                  {pipelineStages.map((stage) => (
                    <option value={stage} key={stage}>
                      {formatValue(stage)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="detail-status-pill stage">
                  {formatValue(requisition.currentStage)}
                </span>
              )}
              {stageError && <p className="hero-stage-error">{stageError}</p>}
            </div>

            <div className="status-field">
              <span className="status-field-label">SLA</span>
              <span
                className={`detail-status-pill sla ${requisition.slaState.toLowerCase()}`}
              >
                {formatValue(requisition.slaState)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="requisition-summary-strip">
        <SummaryMetric
          icon={<Target size={19} />}
          label="Hiring progress"
          value={`${requisition.filledGoal}/${requisition.hiringGoal}`}
          detail={`${requisition.remainingGoal} remaining`}
        />

        <SummaryMetric
          icon={<Clock3 size={19} />}
          label="Days open"
          value={`${requisition.daysOpen}`}
          detail="days"
        />

        <SummaryMetric
          icon={<AlertTriangle size={19} />}
          label="Open bottlenecks"
          value={`${openBottlenecks.length}`}
          detail={openBottlenecks.length === 1 ? "blocker" : "blockers"}
          warning={openBottlenecks.length > 0}
        />

        <SummaryMetric
          icon={<ListChecks size={19} />}
          label="Open actions"
          value={`${openActions.length}`}
          detail={openActions.length === 1 ? "follow-up" : "follow-ups"}
        />
      </section>

      <section className="detail-workspace">
        <nav
          className="detail-section-nav"
          aria-label="Requisition detail sections"
        >
          {requisitionSections.map((section) => (
            <button
              className={
                activeSection === section.id
                  ? "detail-nav-item active"
                  : "detail-nav-item"
              }
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <span className="detail-nav-icon">{section.icon}</span>

              <span className="detail-nav-copy">
                <strong>{section.label}</strong>
                <span>{section.description}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="detail-section-content">
          {activeSection === "overview" && (
            <section className="detail-grid">
              <DetailPanel
                title="Requisition overview"
                icon={<FileText size={19} />}
              >
                <dl className="detail-list">
                  <DetailItem
                    label="Hiring manager"
                    value={requisition.hiringManager}
                  />

                  <DetailItem
                    label="Priority"
                    value={formatValue(requisition.priority)}
                    badge={`priority-${requisition.priority.toLowerCase()}`}
                  />

                  <DetailItem
                    label="Posting"
                    value={formatValue(requisition.postingType)}
                  />

                  <DetailItem
                    label="Days open"
                    value={`${requisition.daysOpen} days`}
                  />

                  <DetailItem
                    label="Opened"
                    value={formatDate(requisition.dateOpened)}
                  />

                  <DetailItem
                    label="Closed"
                    value={
                      requisition.closedDate
                        ? formatDate(requisition.closedDate)
                        : "Not closed"
                    }
                  />
                </dl>
              </DetailPanel>

              <DetailPanel title="Hiring progress" icon={<Target size={19} />}>
                <div className="progress-overview">
                  <div className="progress-heading">
                    <div>
                      <span className="progress-label">Positions filled</span>

                      <strong>
                        {requisition.filledGoal}
                        <small> / {requisition.hiringGoal}</small>
                      </strong>
                    </div>

                    <span className="progress-percentage">
                      {progressPercentage}%
                    </span>
                  </div>

                  <div
                    className="progress-track"
                    aria-label={`${progressPercentage}% hiring progress`}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="progress-footer">
                    <span>
                      <CheckCircle2 size={15} />
                      {requisition.filledGoal} filled
                    </span>

                    <span>{requisition.remainingGoal} remaining</span>
                  </div>
                </div>

                <dl className="detail-list compact">
                  <DetailItem
                    label="Open bottlenecks"
                    value={`${openBottlenecks.length}`}
                  />

                  <DetailItem
                    label="Open actions"
                    value={`${openActions.length}`}
                  />

                  <DetailItem
                    label="Stalled"
                    value={requisition.isStalled ? "Yes" : "No"}
                    badge={
                      requisition.isStalled
                        ? "detail-danger-badge"
                        : "detail-success-badge"
                    }
                  />
                </dl>
              </DetailPanel>

              <DetailPanel
                title="Recruitment notes"
                icon={<FileText size={19} />}
                className="detail-panel-wide"
              >
                <div className="notes-grid">
                  <div className="note-box">
                    <span>Status comment</span>
                    <p>
                      {requisition.statusComment ||
                        "No status comment has been added."}
                    </p>
                  </div>

                  <div className="note-box">
                    <span>Hiring manager notes</span>
                    <p>
                      {requisition.hiringManagerNotes ||
                        "No hiring manager notes have been added."}
                    </p>
                  </div>
                </div>
              </DetailPanel>
            </section>
          )}

          {activeSection === "bottlenecks" && (
            <DetailPanel
              title="Open bottlenecks"
              icon={<AlertTriangle size={19} />}
              action={
                <button
                  className="detail-primary-button"
                  type="button"
                  disabled={!canWrite}
                  title={
                    canWrite
                      ? undefined
                      : "Only recruiters and Talent Acquisition Managers can add bottlenecks"
                  }
                  onClick={() => setIsAddingBottleneck((current) => !current)}
                >
                  <Plus size={16} />
                  Add bottleneck
                </button>
              }
            >
              {openBottlenecks.length === 0 ? (
                <EmptySection
                  icon={<CheckCircle2 size={26} />}
                  title="No open bottlenecks"
                  message="Everything looks clear. There are currently no unresolved blockers for this requisition."
                />
              ) : (
                <div className="stack-list">
                  {openBottlenecks.map((bottleneck) => (
                    <BottleneckCard
                      bottleneck={bottleneck}
                      canResolve={canResolveBottleneck(
                        bottleneck,
                        user?.id,
                        user?.roles ?? [],
                      )}
                      key={bottleneck.id}
                      onResolved={reload}
                      requisitionId={requisition.id}
                    />
                  ))}
                </div>
              )}
            </DetailPanel>
          )}

          {activeSection === "actions" && (
            <DetailPanel
              title="Open action items"
              icon={<ListChecks size={19} />}
              action={
                <button
                  className="detail-primary-button"
                  type="button"
                  disabled={!canWrite}
                  title={
                    canWrite
                      ? undefined
                      : "Only recruiters and Talent Acquisition Managers can add actions"
                  }
                  onClick={() => setIsAddingAction((current) => !current)}
                >
                  <Plus size={16} />
                  Add action
                </button>
              }
            >
              {openActions.length === 0 ? (
                <EmptySection
                  icon={<CheckCircle2 size={26} />}
                  title="No open action items"
                  message="There are no outstanding follow-ups for this requisition."
                />
              ) : (
                <div className="stack-list">
                  {openActions.map((action) => (
                    <ActionCard
                      action={action}
                      canComplete={canManageAction(
                        action,
                        user?.id,
                        user?.roles ?? [],
                      )}
                      key={action.id}
                      onCompleted={reload}
                      requisitionId={requisition.id}
                    />
                  ))}
                </div>
              )}
            </DetailPanel>
          )}

          {activeSection === "history" && (
            <DetailPanel title="Stage history" icon={<History size={19} />}>
              {requisition.stageHistory.length === 0 ? (
                <EmptySection
                  icon={<History size={26} />}
                  title="No stage history"
                  message="Pipeline movement will appear here as the requisition progresses."
                />
              ) : (
                <div className="history-list">
                  {requisition.stageHistory.map((stage, index) => (
                    <StageRow
                      stage={stage}
                      isLast={index === requisition.stageHistory.length - 1}
                      key={stage.id}
                    />
                  ))}
                </div>
              )}
            </DetailPanel>
          )}
        </div>
      </section>

      {canWrite && isAddingBottleneck && (
        <Modal
          title="Add bottleneck"
          subtitle="Record a blocker that is affecting this requisition."
          onClose={() => setIsAddingBottleneck(false)}
        >
          <BottleneckForm
            onCancel={() => setIsAddingBottleneck(false)}
            onCreated={handleBottleneckCreated}
            owners={ownerOptions}
            requisitionId={requisition.id}
          />
        </Modal>
      )}

      {canWrite && isAddingAction && (
        <Modal
          title="Add action"
          subtitle="Create a follow-up task for this requisition."
          onClose={() => setIsAddingAction(false)}
        >
          <ActionItemForm
            onCancel={() => setIsAddingAction(false)}
            onCreated={handleActionCreated}
            owners={ownerOptions}
            requisitionId={requisition.id}
          />
        </Modal>
      )}
    </>
  );
}

function SummaryMetric({
  detail,
  icon,
  label,
  value,
  warning = false,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className={`summary-metric ${warning ? "warning" : ""}`}>
      <div className="summary-metric-icon">{icon}</div>

      <div className="summary-metric-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function EmptySection({
  icon,
  message,
  title,
}: {
  icon: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <div className="detail-empty-state">
      <div className="detail-empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function toRequisitionSection(value: string | null): RequisitionDetailSection {
  return requisitionSections.some((section) => section.id === value)
    ? (value as RequisitionDetailSection)
    : "overview";
}

function DetailPanel({
  action,
  children,
  className = "",
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <article className={`detail-panel ${className}`}>
      <div className="panel-heading">
        <div className="panel-title">
          {icon && <span className="panel-title-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>

        {action}
      </div>

      <div className="detail-panel-body">{children}</div>
    </article>
  );
}

function Modal({
  children,
  onClose,
  subtitle,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div
      className="detail-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="detail-modal-panel"
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
      >
        <div className="detail-modal-heading">
          <div>
            <span className="modal-eyebrow">Requisition</span>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            className="modal-close-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

function DetailItem({
  badge,
  label,
  value,
}: {
  badge?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="detail-list-item">
      <dt>{label}</dt>

      <dd>
        {badge ? (
          <span className={`detail-value-badge ${badge}`}>{value}</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function BottleneckCard({
  bottleneck,
  canResolve,
  onResolved,
  requisitionId,
}: {
  bottleneck: Bottleneck;
  canResolve: boolean;
  onResolved: () => Promise<void>;
  requisitionId: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleResolve() {
    if (!canResolve) {
      return;
    }

    setIsSaving(true);

    try {
      await resolveBottleneck(requisitionId, bottleneck.id, {
        resolutionSummary: "Resolved from dashboard.",
      });

      await onResolved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="detail-card bottleneck-card">
      <div className="detail-card-accent" />

      <div className="detail-card-content">
        <div className="detail-card-top">
          <div className="detail-card-heading">
            <span className="card-type-icon bottleneck-icon">
              <AlertTriangle size={17} />
            </span>

            <div>
              <strong>{bottleneck.title}</strong>
              <span className="detail-card-owner">
                <UserRound size={13} />
                {bottleneck.owner}
              </span>
            </div>
          </div>

          <span
            className={`priority-badge ${bottleneck.priority.toLowerCase()}`}
          >
            {formatValue(bottleneck.priority)}
          </span>
        </div>

        <p className="detail-card-description">{bottleneck.reason}</p>

        <div className="detail-card-footer">
          <span className="card-meta">
            <Clock3 size={14} />
            {bottleneck.daysOpen} days open
          </span>

          <button
            className="resolve-button"
            type="button"
            disabled={!canResolve || isSaving}
            onClick={handleResolve}
            title={
              canResolve
                ? undefined
                : "Only the owner or Talent Acquisition Manager can resolve this bottleneck"
            }
          >
            <CheckCircle2 size={15} />
            {isSaving ? "Resolving..." : "Resolve"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ActionCard({
  action,
  canComplete,
  onCompleted,
  requisitionId,
}: {
  action: ActionItem;
  canComplete: boolean;
  onCompleted: () => Promise<void>;
  requisitionId: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleComplete() {
    if (!canComplete) {
      return;
    }

    setIsSaving(true);

    try {
      await completeActionItem(requisitionId, action.id, {
        completionNotes: "Completed from dashboard.",
      });

      await onCompleted();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="detail-card action-card">
      <div className="detail-card-accent action-accent" />

      <div className="detail-card-content">
        <div className="detail-card-top">
          <div className="detail-card-heading">
            <span className="card-type-icon action-icon">
              <ListChecks size={17} />
            </span>

            <div>
              <strong>{action.title || "Untitled action"}</strong>

              <span className="detail-card-owner">
                <UserRound size={13} />
                {action.owner}
              </span>
            </div>
          </div>

          <span className={`priority-badge ${action.priority.toLowerCase()}`}>
            {formatValue(action.priority)}
          </span>
        </div>

        <p className="detail-card-description">{action.description}</p>

        <div className="detail-card-footer">
          <span className="card-meta">
            <CalendarDays size={14} />
            {action.dueDate
              ? `Due ${formatDate(action.dueDate)}`
              : "No due date"}
          </span>

          <button
            className="complete-button"
            type="button"
            disabled={!canComplete || isSaving}
            onClick={handleComplete}
            title={
              canComplete
                ? undefined
                : "Only the owner or Talent Acquisition Manager can complete this action"
            }
          >
            <CheckCircle2 size={15} />
            {isSaving ? "Completing..." : "Complete"}
          </button>
        </div>
      </div>
    </article>
  );
}

function BottleneckForm({
  onCancel,
  onCreated,
  owners,
  requisitionId,
}: {
  onCancel?: () => void;
  onCreated: () => Promise<void>;
  owners: OwnerOption[];
  requisitionId: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState(bottleneckCategories[0]);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    if (!value(form, "reason") || !value(form, "ownerUserId")) {
      setError("Please complete the required fields.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await addBottleneck(requisitionId, {
        reason: value(form, "reason"),
        ownerUserId: value(form, "ownerUserId"),
        category: value(form, "category") || "Other",
        customCategory: nullableValue(form.get("customCategory")),
        priority: value(form, "priority") || "Medium",
        description: nullableValue(form.get("description")),
        businessImpact: nullableValue(form.get("businessImpact")),
      });

      formElement.reset();
      await onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bottleneck could not be added.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="detail-form" onSubmit={handleSubmit}>
      <div className="modal-form-grid">
        <FormField label="Reason" required>
          <input
            name="reason"
            required
            placeholder="What is blocking progress?"
          />
        </FormField>

        <Select
          label="Owner"
          name="ownerUserId"
          options={owners.map((owner) => [owner.id, owner.name])}
        />

        <Select
          label="Category"
          name="category"
          onChange={setCategory}
          options={bottleneckCategories.map((item) => [
            item,
            formatValue(item),
          ])}
        />

        <Select
          label="Priority"
          name="priority"
          options={bottleneckPriorities.map((item) => [
            item,
            formatValue(item),
          ])}
        />

        {category === "Other" && (
          <FormField label="Custom category" required>
            <input name="customCategory" required />
          </FormField>
        )}
      </div>

      <FormField label="Description">
        <textarea
          name="description"
          rows={3}
          placeholder="Add more context about the blocker..."
        />
      </FormField>

      <FormField label="Business impact">
        <textarea
          name="businessImpact"
          rows={3}
          placeholder="Explain the impact this blocker is having..."
        />
      </FormField>

      {error && <p className="detail-form-error">{error}</p>}

      <div className="detail-form-actions">
        {onCancel && (
          <button
            className="detail-secondary-button"
            type="button"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}

        <button
          className="detail-primary-button"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Adding..." : "Add bottleneck"}
        </button>
      </div>
    </form>
  );
}

function ActionItemForm({
  onCancel,
  onCreated,
  owners,
  requisitionId,
}: {
  onCancel?: () => void;
  onCreated: () => Promise<void>;
  owners: OwnerOption[];
  requisitionId: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState(actionCategories[0]);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    if (!value(form, "description") || !value(form, "ownerUserId")) {
      setError("Please complete the required fields.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await addActionItem(requisitionId, {
        title: nullableValue(form.get("title")),
        description: value(form, "description"),
        ownerUserId: value(form, "ownerUserId"),
        category: value(form, "category") || "Other",
        customCategory: nullableValue(form.get("customCategory")),
        priority: value(form, "priority") || "Medium",
        dueDate: nullableValue(form.get("dueDate")),
      });

      formElement.reset();
      await onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Action could not be added.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="detail-form" onSubmit={handleSubmit}>
      <div className="modal-form-grid">
        <FormField label="Title">
          <input name="title" placeholder="e.g. Schedule final interview" />
        </FormField>

        <Select
          label="Owner"
          name="ownerUserId"
          options={owners.map((owner) => [owner.id, owner.name])}
        />

        <Select
          label="Category"
          name="category"
          onChange={setCategory}
          options={actionCategories.map((item) => [item, formatValue(item)])}
        />

        <Select
          label="Priority"
          name="priority"
          options={actionPriorities.map((item) => [item, formatValue(item)])}
        />

        <FormField label="Due date">
          <input name="dueDate" type="date" />
        </FormField>

        {category === "Other" && (
          <FormField label="Custom category" required>
            <input name="customCategory" required />
          </FormField>
        )}
      </div>

      <FormField label="Description" required>
        <textarea
          name="description"
          rows={4}
          required
          placeholder="Describe what needs to be done..."
        />
      </FormField>

      {error && <p className="detail-form-error">{error}</p>}

      <div className="detail-form-actions">
        {onCancel && (
          <button
            className="detail-secondary-button"
            type="button"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}

        <button
          className="detail-primary-button"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Adding..." : "Add action"}
        </button>
      </div>
    </form>
  );
}

function FormField({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="detail-form-field">
      <span>
        {label}
        {required && <em>*</em>}
      </span>
      {children}
    </label>
  );
}

function Select({
  label,
  name,
  onChange,
  options,
}: {
  label: string;
  name: string;
  onChange?: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="detail-form-field">
      <span>{label}</span>

      <select
        name={name}
        onChange={(event) => onChange?.(event.target.value)}
        required
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map(([value, optionLabel]) => (
          <option value={value} key={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function canResolveBottleneck(
  bottleneck: Bottleneck,
  userId: string | undefined,
  roles: string[],
) {
  return (
    bottleneck.ownerUserId === userId ||
    roles.includes("TalentAcquisitionManager")
  );
}

function canManageAction(
  action: ActionItem,
  userId: string | undefined,
  roles: string[],
) {
  return (
    action.ownerUserId === userId || roles.includes("TalentAcquisitionManager")
  );
}

function StageRow({
  isLast,
  stage,
}: {
  isLast: boolean;
  stage: StageTransition;
}) {
  return (
    <div className="history-row">
      <div className="history-timeline">
        <span className="history-dot" />

        {!isLast && <span className="history-line" />}
      </div>

      <div className="history-content">
        <div className="history-heading">
          <strong>{formatValue(stage.status)}</strong>

          <span className="history-duration">{stage.daysInStage} days</span>
        </div>

        <span className="history-date">{formatDateTime(stage.enteredAt)}</span>
      </div>
    </div>
  );
}

function value(form: FormData, key: string) {
  return form.get(key)?.toString().trim() ?? "";
}

function nullableValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();

  return text ? text : null;
}
