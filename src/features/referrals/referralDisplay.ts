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
  const displayNames: Record<string, string> = {
    ClientExperience: 'Client Experience',
    ITInfrastructure: 'IT/Infrastructure',
    MarketingAndCommunications: 'Marketing and Communications',
    OfferExtended: 'Offer Extended',
    UnderReview: 'Under Review',
  }

  if (displayNames[value]) {
    return displayNames[value]
  }

  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
