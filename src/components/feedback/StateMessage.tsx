type StateMessageProps = {
  title: string
  message?: string
  tone?: 'neutral' | 'error'
}

type LoadingStateProps = {
  message?: string
  branded?: boolean
}

export function LoadingState({ branded = false, message = 'Loading...' }: LoadingStateProps) {
  if (branded) {
    return (
      <div className="brand-loader" role="status" aria-live="polite">
        <img src="/cavista-logo.png" alt="Cavista" />
        <strong>TalentLens</strong>
        <span>{message}</span>
        <div />
      </div>
    )
  }

  return <StateMessage title={message} />
}

export function ErrorState({ title, message }: Omit<StateMessageProps, 'tone'>) {
  return <StateMessage title={title} message={message} tone="error" />
}

function StateMessage({ title, message, tone = 'neutral' }: StateMessageProps) {
  return (
    <div className={`state-message ${tone}`}>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  )
}
