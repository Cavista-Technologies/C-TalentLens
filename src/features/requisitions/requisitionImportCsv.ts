import { normalizeCsvHeader, parseCsv, toCsvCell } from '../../lib/csv'

export type RequisitionImportRow = {
  requisitionCode?: string | null
  roleName: string
  team: string
  reasonForOpening?: string | null
  hiringManager: string
  internalExternalPosting?: string | null
  commentOnStatus?: string | null
  notesFromHiringManager?: string | null
  recruiterName?: string | null
  recruiterEmail?: string | null
  priority: string
  dateOpened?: string | null
  closedDate?: string | null
  hiringGoal: number
  filledGoal: number
  status: string
  stage: string
}

const headerMap: Record<string, keyof RequisitionImportRow> = {
  'requisition code': 'requisitionCode',
  code: 'requisitionCode',
  'role name': 'roleName',
  role: 'roleName',
  team: 'team',
  department: 'team',
  'reason for opening': 'reasonForOpening',
  reason: 'reasonForOpening',
  'hiring manager': 'hiringManager',
  'internal/external posting': 'internalExternalPosting',
  posting: 'internalExternalPosting',
  'comment on status': 'commentOnStatus',
  comment: 'commentOnStatus',
  'notes from hiring manager': 'notesFromHiringManager',
  notes: 'notesFromHiringManager',
  recruiter: 'recruiterName',
  'recruiter name': 'recruiterName',
  'recruiter email': 'recruiterEmail',
  priority: 'priority',
  'date opened': 'dateOpened',
  'opened date': 'dateOpened',
  'closed date': 'closedDate',
  'hiring goal': 'hiringGoal',
  'filled goal': 'filledGoal',
  status: 'status',
  stage: 'stage',
}

const requisitionTemplateCsv = [
  [
    'Requisition Code',
    'Role Name',
    'Team',
    'Reason For Opening',
    'Hiring Manager',
    'Internal/External Posting',
    'Comment On Status',
    'Notes From Hiring Manager',
    'Recruiter Name',
    'Recruiter Email',
    'Priority',
    'Date Opened',
    'Closed Date',
    'Hiring Goal',
    'Filled Goal',
    'Status',
    'Stage',
  ],
  [
    'REQ-2026-010',
    'Software Engineer',
    'Engineering',
    'Expansion',
    'Ada Okafor',
    'External',
    'JD approved and ready to publish',
    'Backend experience required',
    'Maya Chen',
    'maya.chen@talentlens.local',
    'High',
    '2026-08-21',
    '',
    '2',
    '0',
    'Active',
    'JD / Job Posting',
  ],
]
  .map((row) => row.map(toCsvCell).join(','))
  .join('\n')

export function parseRequisitionCsv(text: string) {
  const table = parseCsv(text)

  if (table.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.')
  }

  const headers = table[0].map((header) => normalizeCsvHeader(header))

  return table
    .slice(1)
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => {
      const row: RequisitionImportRow = {
        roleName: '',
        team: '',
        hiringManager: '',
        priority: 'Medium',
        hiringGoal: 1,
        filledGoal: 0,
        status: 'Active',
        stage: 'JobPosting',
      }

      headers.forEach((header, index) => {
        const field = headerMap[header]
        const value = cells[index]?.trim()

        if (!field || !value) {
          return
        }

        if (field === 'hiringGoal' || field === 'filledGoal') {
          row[field] = Number(value)
          return
        }

        if (field === 'stage') {
          row.stage = normalizeStage(value)
          return
        }

        if (field === 'status') {
          row.status = normalizeStatus(value)
          return
        }

        row[field] = value
      })

      return row
    })
}

export function getRequisitionTemplateUrl() {
  return URL.createObjectURL(new Blob([requisitionTemplateCsv], { type: 'text/csv;charset=utf-8' }))
}

function normalizeStatus(value: string) {
  const normalized = normalizeOption(value)
  const statuses: Record<string, string> = {
    active: 'Active',
    hold: 'Hold',
    closed: 'Closed',
  }

  return statuses[normalized] ?? value
}

function normalizeStage(value: string) {
  const normalized = normalizeOption(value)
  const stages: Record<string, string> = {
    jdjobposting: 'JobPosting',
    jobposting: 'JobPosting',
    pipeliningsourcing: 'PipeliningSourcing',
    sourcing: 'PipeliningSourcing',
    sparkhire: 'SparkHire',
    interview: 'Interview',
    requesttohire: 'RequestToHire',
    offeredhired: 'OfferedHired',
    offered: 'OfferedHired',
    hired: 'OfferedHired',
  }

  return stages[normalized] ?? value
}

function normalizeOption(value: string) {
  return value
    .toLowerCase()
    .split('')
    .filter((char) => /[a-z0-9]/.test(char))
    .join('')
}
