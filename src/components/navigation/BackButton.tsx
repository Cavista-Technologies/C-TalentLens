import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type BackButtonProps = {
  fallbackTo: string
  label?: string
  onBeforeNavigate?: () => boolean
}

export function BackButton({ fallbackTo, label = 'Back', onBeforeNavigate }: BackButtonProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBeforeNavigate && !onBeforeNavigate()) {
      return
    }

    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(fallbackTo)
  }

  return (
    <button className="back-link" type="button" onClick={handleBack}>
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </button>
  )
}
