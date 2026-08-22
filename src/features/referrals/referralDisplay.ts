export const referralStatuses = [
  'Submitted',
  'UnderReview',
  'Screening',
  'Interviewing',
  'OfferExtended',
  'Hired',
  'Rejected',
  'Withdrawn',
  'Ineligible',
]

export function formatValue(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
