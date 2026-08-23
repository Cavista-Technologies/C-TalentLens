import { Navigate, Route, Routes } from 'react-router-dom'
import { AlertsPage } from '../pages/AlertsPage'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { DashboardPage } from '../pages/DashboardPage'
import { ImportsPage } from '../pages/ImportsPage'
import { LoginPage } from '../pages/LoginPage'
import { NewReferralPage } from '../pages/NewReferralPage'
import { PublicReferralPage } from '../pages/PublicReferralPage'
import { ReferralAnalyticsPage } from '../pages/ReferralAnalyticsPage'
import { ReferralDetailPage } from '../pages/ReferralDetailPage'
import { ReferralsPage } from '../pages/ReferralsPage'
import { RequisitionDetailPage } from '../pages/RequisitionDetailPage'
import { RequisitionFormPage } from '../pages/RequisitionFormPage'
import { RequisitionsPage } from '../pages/RequisitionsPage'
import { ProtectedRoute } from './ProtectedRoute'

const analyticsRoles = ['TalentAcquisitionManager', 'Leadership']
const recruitmentWriteRoles = ['Recruiter', 'TalentAcquisitionManager']

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/refer" element={<PublicReferralPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <AlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requisitions"
        element={
          <ProtectedRoute>
            <RequisitionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requisitions/new"
        element={
          <ProtectedRoute allowedRoles={recruitmentWriteRoles}>
            <RequisitionFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requisitions/:id"
        element={
          <ProtectedRoute>
            <RequisitionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requisitions/:id/edit"
        element={
          <ProtectedRoute allowedRoles={recruitmentWriteRoles}>
            <RequisitionFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referrals"
        element={
          <ProtectedRoute>
            <ReferralsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referrals/new"
        element={
          <ProtectedRoute allowedRoles={recruitmentWriteRoles}>
            <NewReferralPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referrals/:id"
        element={
          <ProtectedRoute>
            <ReferralDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/imports"
        element={
          <ProtectedRoute allowedRoles={recruitmentWriteRoles}>
            <ImportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={analyticsRoles}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics/referrals"
        element={
          <ProtectedRoute allowedRoles={analyticsRoles}>
            <ReferralAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
