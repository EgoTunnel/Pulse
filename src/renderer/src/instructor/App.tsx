import { useEditorStore } from './store'
import { Library } from './components/Library'
import { Editor } from './components/Editor'
import { PresentMode } from './components/PresentMode'

export function App(): JSX.Element {
  const view = useEditorStore((s) => s.view)

  return (
    <div className="h-screen w-screen overflow-hidden bg-ink-950">
      {view === 'library' && <Library />}
      {view === 'editor' && <Editor />}
      {view === 'present' && <PresentMode />}
    </div>
  )
}
