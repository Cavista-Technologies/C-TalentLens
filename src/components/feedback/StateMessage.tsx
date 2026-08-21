type StateMessageProps = {
  title: string
  message?: string
  tone?: 'neutral' | 'error'
}

export function LoadingState({ message = 'Loading...' }: Pick<StateMessageProps, 'message'>) {
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
