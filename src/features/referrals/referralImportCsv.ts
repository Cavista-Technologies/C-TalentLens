import { normalizeCsvHeader, parseCsv, toCsvCell } from '../../lib/csv'

export type ReferralImportRow = {
  roleReferredFor?: string | null
  email?: string | null
  name?: string | null
  candidateFullName?: string | null
  candidateEmail?: string | null
  candidatePhoneNumber?: string | null
  cvUpload?: string | null
  howDoYouKnowThisCandidate?: string | null
  howLongHaveYouKnownThisCandidate?: string | null
  inLineWithCalveoValues?: string | null
  startTime?: string | null
  completionTime?: string | null
  status: string
  hiringOutcome: string
  submissionDate?: string | null
}

const headerMap: Record<string, keyof ReferralImportRow> = {
  'role referred for': 'roleReferredFor',
  role: 'roleReferredFor',
  requisition: 'roleReferredFor',
  email: 'email',
  'referrer email': 'email',
  name: 'name',
  'referrer name': 'name',
  'candidate full name': 'candidateFullName',
  'candidate name': 'candidateFullName',
  candidate: 'candidateFullName',
  'candidate email': 'candidateEmail',
  'candidate phone': 'candidatePhoneNumber',
  'candidate phone number': 'candidatePhoneNumber',
  phone: 'candidatePhoneNumber',
  'cv upload': 'cvUpload',
  'resume url': 'cvUpload',
  resume: 'cvUpload',
  'how do you know this candidate': 'howDoYouKnowThisCandidate',
  relationship: 'howDoYouKnowThisCandidate',
  'how long have you known this candidate': 'howLongHaveYouKnownThisCandidate',
  'known duration': 'howLongHaveYouKnownThisCandidate',
  'in line with calveo values': 'inLineWithCalveoValues',
  'alignment comment': 'inLineWithCalveoValues',
  'start time': 'startTime',
  'completion time': 'completionTime',
  status: 'status',
  'hiring outcome': 'hiringOutcome',
  'submission date': 'submissionDate',
}

const referralTemplateCsv = [
  [
    'Role Referred For',
    'Referrer Email',
    'Referrer Name',
    'Candidate Full Name',
    'Candidate Email',
    'Candidate Phone Number',
    'Resume URL',
    'How Do You Know This Candidate',
    'How Long Have You Known This Candidate',
    'Alignment Comment',
    'Submission Date',
    'Status',
    'Hiring Outcome',
  ],
  [
    'Software Engineer',
    'referrer@cavista.com',
    'Taylor Morgan',
    'Jordan Lee',
    'jordan.lee@example.com',
    '+2348012345678',
    'https://res.cloudinary.com/demo/resume.pdf',
    'Former colleague',
    '2 years',
    'Strong ownership and collaboration',
    '2026-08-21',
    'Submitted',
    'Pending',
  ],
]
  .map((row) => row.map(toCsvCell).join(','))
  .join('\n')

export function parseReferralCsv(text: string) {
  const table = parseCsv(text)

  if (table.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.')
  }

  const headers = table[0].map((header) => normalizeCsvHeader(header))

  return table
    .slice(1)
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => {
      const row: ReferralImportRow = {
        status: 'Submitted',
        hiringOutcome: 'Pending',
      }

      headers.forEach((header, index) => {
        const field = headerMap[header]
        const value = cells[index]?.trim()

        if (field && value) {
          row[field] = value
        }
      })

      return row
    })
}

export function getReferralTemplateUrl() {
  return URL.createObjectURL(new Blob([referralTemplateCsv], { type: 'text/csv;charset=utf-8' }))
}
