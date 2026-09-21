import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectActions } from './useProjectActions'

export function ProjectSwitcher() {
  const projectId = useAppStore((s) => s.projectId)
  const projectName = useAppStore((s) => s.projectName)
  const projects = useAppStore((s) => s.projects)
  const setProjectName = useAppStore((s) => s.setProjectName)
  const { switchTo, createNew, remove, exportCurrent, importFromFile } = useProjectActions()

  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(projectName)
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Seeded fresh from projectName each time editing starts (not synced via effect) — a
  // different project becoming active while not editing just leaves this draft stale and unread.
  const startEditing = () => {
    setDraftName(projectName)
    setIsEditing(true)
  }

  const commitRename = () => {
    const trimmed = draftName.trim()
    setProjectName(trimmed.length > 0 ? trimmed : projectName)
    setIsEditing(false)
  }

  const handleImportFile = async (file: File) => {
    setImportError(null)
    try {
      await importFromFile(file)
    } catch {
      setImportError('Could not import that file — is it a valid project export?')
    }
  }

  if (!projectId) return null

  const otherProjects = projects.filter((p) => p.id !== projectId)

  return (
    <div className="project-switcher">
      <div className="project-switcher__row">
        {isEditing ? (
          <input
            autoFocus
            className="project-switcher__name-input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraftName(projectName)
                setIsEditing(false)
              }
            }}
          />
        ) : (
          <span className="project-switcher__name" onDoubleClick={startEditing} title="Double-click to rename">
            {projectName}
          </span>
        )}
        {!isEditing && (
          <button type="button" className="project-switcher__icon-btn" title="Rename project" onClick={startEditing}>
            ✎
          </button>
        )}
        <button type="button" className="project-switcher__icon-btn" title="Delete this project" onClick={() => void remove(projectId)}>
          ×
        </button>
      </div>

      {otherProjects.length > 0 && (
        <select
          className="project-switcher__select"
          value=""
          onChange={(e) => {
            if (e.target.value) void switchTo(e.target.value)
          }}
        >
          <option value="">Switch project… ({otherProjects.length} other{otherProjects.length === 1 ? '' : 's'})</option>
          {otherProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      <div className="project-switcher__actions">
        <button type="button" onClick={() => void createNew()}>
          + New Project
        </button>
        <button type="button" onClick={exportCurrent}>
          Export
        </button>
        <button type="button" onClick={() => importInputRef.current?.click()}>
          Import
        </button>
      </div>
      {importError && <div className="project-switcher__error">{importError}</div>}

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleImportFile(file)
        }}
      />
    </div>
  )
}
