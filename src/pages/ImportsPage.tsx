import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PageContainer } from '../components/layout/PageContainer'
import { importReferrals } from '../features/referrals/referralApi'
import { getReferralTemplateUrl, parseReferralCsv, type ReferralImportRow } from '../features/referrals/referralImportCsv'
import type { ImportResult } from '../features/referrals/referralTypes'

export function ImportsPage() {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ReferralImportRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setResult(null)
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
      setRows(parseReferralCsv(text))
    } catch (err) {
      setFileName(file.name)
      setError(err instanceof Error ? err.message : 'CSV could not be parsed.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (rows.length === 0) {
      setError('Select a CSV file with referral rows.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setResult(null)

    try {
      setResult(await importReferrals(rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout title="Import">
      <PageContainer>
        <form className="form-panel centered-form" onSubmit={handleSubmit}>
          <a className="template-link" href={getReferralTemplateUrl()} download="referral-import-template.csv">
            Download CSV template
          </a>

          <label>
            Referral CSV
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          </label>

          <section className="import-preview" aria-label="Import preview">
            <div>
              <span>File</span>
              <strong>{fileName || 'No file selected'}</strong>
            </div>
            <div>
              <span>Rows ready</span>
              <strong>{rows.length}</strong>
            </div>
          </section>

          {rows.length > 0 && (
            <div className="preview-table">
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
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link className="cancel-link" to="/referrals">
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
      </PageContainer>
    </AppLayout>
  )
}
