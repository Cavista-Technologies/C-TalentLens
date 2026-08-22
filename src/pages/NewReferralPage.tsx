import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { ReferralForm } from '../features/referrals/ReferralForm'

export function NewReferralPage() {
  const navigate = useNavigate()

  return (
    <AppLayout title="New Referral">
      <PageContainer>
        <Link className="back-link" to="/referrals">
          Back to referrals
        </Link>

        <ReferralForm onCancel={() => navigate('/referrals')} onSaved={() => navigate('/referrals')} />
      </PageContainer>
    </AppLayout>
  )
}
