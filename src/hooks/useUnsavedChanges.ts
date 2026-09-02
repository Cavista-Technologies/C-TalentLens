import { useEffect } from 'react'

const defaultMessage = 'You have unsaved changes. Leave this page?'

export function useUnsavedChanges(hasUnsavedChanges: boolean, message = defaultMessage) {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = message
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, message])

  function confirmDiscard() {
    return !hasUnsavedChanges || window.confirm(message)
  }

  return { confirmDiscard }
}
