import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { syncSmartRecruitersJobs, type SmartRecruitersSyncResult } from '../features/integrations/smartRecruitersApi'
import { importRequisitions } from '../features/requisitions/requisitionApi'
import { getRequisitionTemplateUrl, parseRequisitionCsv, type RequisitionImportRow } from '../features/requisitions/requisitionImportCsv'
import { importReferrals } from '../features/referrals/referralApi'
import { getReferralTemplateUrl, parseReferralCsv, type ReferralImportRow } from '../features/referrals/referralImportCsv'
import type { ImportResult } from '../features/referrals/referralTypes'

type ImportType = 'requisitions' | 'referrals'
type ImportRow = RequisitionImportRow | ReferralImportRow

export function ImportsPage() {
  const [importType, setImportType] = useState<ImportType>('requisitions')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [smartRecruitersResult, setSmartRecruitersResult] = useState<SmartRecruitersSyncResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncingSmartRecruiters, setIsSyncingSmartRecruiters] = useState(false)
  const [error, setError] = useState('')

  function handleImportTypeChange(nextType: ImportType) {
    setImportType(nextType)
    setFileName('')
    setRows([])
    setResult(null)
    setSmartRecruitersResult(null)
    setError('')
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setResult(null)
    setSmartRecruitersResult(null)
    setError('')
    setRows([])

    if (!file) {
      setFileName('')
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileName(file.name)
      setError('Upload a CSV file.')
      return
    }

    try {
      const text = await file.text()
      setFileName(file.name)
      setRows(importType === 'requisitions' ? parseRequisitionCsv(text) : parseReferralCsv(text))
    } catch (err) {
      setFileName(file.name)
      setError(err instanceof Error ? err.message : 'CSV could not be parsed.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (rows.length === 0) {
      setError(`Select a CSV file with ${importType} rows.`)
      return
    }

    setIsSubmitting(true)
    setError('')
    setResult(null)
    setSmartRecruitersResult(null)

    try {
      setResult(importType === 'requisitions' ? await importRequisitions(rows) : await importReferrals(rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSmartRecruitersSync() {
    setIsSyncingSmartRecruiters(true)
    setError('')
    setResult(null)
    setSmartRecruitersResult(null)

    try {
      setSmartRecruitersResult(await syncSmartRecruitersJobs())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SmartRecruiters sync failed.')
    } finally {
      setIsSyncingSmartRecruiters(false)
    }
  }

  return (
    <AppLayout title="Import">
      <PageContainer>
        <form className="import-panel" onSubmit={handleSubmit}>
          <div className="import-toolbar">
            <label>
              Import type
              <select value={importType} onChange={(event) => handleImportTypeChange(event.target.value as ImportType)}>
                <option value="requisitions">Requisitions</option>
                <option value="referrals">Referrals</option>
              </select>
            </label>

            <a className="template-link import-template-action" href={getTemplateUrl(importType)} download={getTemplateFileName(importType)}>
              Download {getImportLabel(importType)} CSV template
            </a>
          </div>

          {importType === 'requisitions' && (
            <section className="smartrecruiters-sync-panel" aria-label="SmartRecruiters sync">
              <div className="smartrecruiters-sync-copy">
                <span>SmartRecruiters</span>
                <strong>Posted jobs</strong>
                <p>Pull open job postings into C-TalentLens as requisitions.</p>
              </div>
              <div className="smartrecruiters-sync-meta">
                <span>Source</span>
                <strong>Mock API</strong>
              </div>
              <button type="button" onClick={handleSmartRecruitersSync} disabled={isSyncingSmartRecruiters}>
                {isSyncingSmartRecruiters ? 'Syncing...' : 'Sync jobs'}
              </button>
            </section>
          )}

          <section className="csv-import-section" aria-label={`${getImportLabel(importType)} CSV import`}>
            <div className="csv-import-heading">
              <span>CSV import</span>
              <strong>{getImportLabel(importType)} upload</strong>
            </div>

            <label className="import-upload-box">
              <span>{getImportLabel(importType)} CSV</span>
              <strong>{fileName || 'Choose a CSV file'}</strong>
              <input key={importType} type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            </label>

            {fileName && (
              <section className="import-preview" aria-label="Import preview">
                <div>
                  <span>File</span>
                  <strong>{fileName}</strong>
                </div>
                <div>
                  <span>Rows ready</span>
                  <strong>{rows.length}</strong>
                </div>
              </section>
            )}

            {rows.length > 0 && (
              <div className="preview-table">
                {importType === 'requisitions' ? (
                  <RequisitionPreview rows={rows as RequisitionImportRow[]} />
                ) : (
                  <ReferralPreview rows={rows as ReferralImportRow[]} />
                )}
              </div>
            )}
          </section>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions import-actions">
            <Link className="cancel-link" to={importType === 'requisitions' ? '/requisitions' : '/referrals'}>
              Cancel
            </Link>
            <button type="submit" disabled={isSubmitting || rows.length === 0}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>

        {result && (
          <section className="import-result">
            <div>
              <span>Total</span>
              <strong>{result.totalRows}</strong>
            </div>
            <div>
              <span>Imported</span>
              <strong>{result.importedCount}</strong>
            </div>
            <div>
              <span>Skipped</span>
              <strong>{result.skippedCount}</strong>
            </div>
            <div>
              <span>Failed</span>
              <strong>{result.failedCount}</strong>
            </div>

            {result.errors.length > 0 && (
              <ul className="import-errors">
                {result.errors.map((item) => (
                  <li key={`${item.rowNumber}-${item.errorCode}`}>
                    Row {item.rowNumber}: {item.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {smartRecruitersResult && (
          <SmartRecruitersResultModal result={smartRecruitersResult} onClose={() => setSmartRecruitersResult(null)} />
        )}
      </PageContainer>
    </AppLayout>
  )
}

function SmartRecruitersResultModal({
  onClose,
  result,
}: {
  onClose: () => void
  result: SmartRecruitersSyncResult
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel wide-modal smartrecruiters-result-panel" aria-modal="true" role="dialog" aria-labelledby="smartrecruiters-sync-title">
        <div className="modal-heading">
          <h2 id="smartrecruiters-sync-title">SmartRecruiters sync</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="smartrecruiters-result-heading">
          <div>
            <span>Sync complete</span>
            <strong>{result.createdCount + result.updatedCount} requisitions processed</strong>
          </div>
          <div className="smartrecruiters-result-stats">
            <span>{result.totalJobs} total</span>
            <span>{result.createdCount} created</span>
            <span>{result.updatedCount} updated</span>
            <span>{result.failedCount} failed</span>
          </div>
        </div>

        {result.items.length > 0 && (
          <div className="smartrecruiters-sync-list">
            {result.items.slice(0, 6).map((item) => (
              <Link to={`/requisitions/${item.requisitionId}`} key={`${item.externalJobId}-${item.action}`}>
                <strong>{item.requisitionCode}</strong>
                <span>{item.roleName}</span>
                <small>{item.externalJobId}</small>
                <em>{item.action}</em>
              </Link>
            ))}
          </div>
        )}

        {result.errors.length > 0 && (
          <ul className="import-errors">
            {result.errors.map((item) => (
              <li key={`${item.externalJobId}-${item.message}`}>
                {item.roleName || item.externalJobId}: {item.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function RequisitionPreview({ rows }: { rows: RequisitionImportRow[] }) {
  return (
    <>
      <div className="preview-row table-head">
        <span>Code</span>
        <span>Role</span>
        <span>Team</span>
        <span>Stage</span>
      </div>
      {rows.slice(0, 5).map((row, index) => (
        <article className="preview-row" key={`${row.requisitionCode ?? row.roleName}-${index}`}>
          <strong>{row.requisitionCode || '-'}</strong>
          <span>{row.roleName || '-'}</span>
          <span>{row.team || '-'}</span>
          <span>{row.stage}</span>
        </article>
      ))}
    </>
  )
}

function ReferralPreview({ rows }: { rows: ReferralImportRow[] }) {
  return (
    <>
      <div className="preview-row table-head">
        <span>Candidate</span>
        <span>Role</span>
        <span>Referrer</span>
        <span>Status</span>
      </div>
      {rows.slice(0, 5).map((row, index) => (
        <article className="preview-row" key={`${row.candidateFullName}-${index}`}>
          <strong>{row.candidateFullName || '-'}</strong>
          <span>{row.roleReferredFor || '-'}</span>
          <span>{row.name || row.email || '-'}</span>
          <span>{row.status}</span>
        </article>
      ))}
    </>
  )
}

function getTemplateUrl(importType: ImportType) {
  return importType === 'requisitions' ? getRequisitionTemplateUrl() : getReferralTemplateUrl()
}

function getTemplateFileName(importType: ImportType) {
  return importType === 'requisitions' ? 'requisition-import-template.csv' : 'referral-import-template.csv'
}

function getImportLabel(importType: ImportType) {
  return importType === 'requisitions' ? 'Requisition' : 'Referral'
}
