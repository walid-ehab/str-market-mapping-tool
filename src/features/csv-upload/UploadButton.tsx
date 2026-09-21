import { useRef } from 'react'
import { CsvValidationError, parseListingsCsv } from '@/lib/csv'
import { useAppStore } from '@/store/useAppStore'

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const isLoadingDataset = useAppStore((s) => s.isLoadingDataset)
  const datasetError = useAppStore((s) => s.datasetError)
  const datasetFileName = useAppStore((s) => s.datasetFileName)
  const listingCount = useAppStore((s) => s.listings.length)
  const projectLastDatasetFileName = useAppStore((s) => s.projectLastDatasetFileName)
  const setLoadingDataset = useAppStore((s) => s.setLoadingDataset)
  const setDatasetError = useAppStore((s) => s.setDatasetError)
  const setDataset = useAppStore((s) => s.setDataset)

  const handleFile = async (file: File) => {
    setLoadingDataset(true)
    setDatasetError(null)
    try {
      const { listings, skippedRows } = await parseListingsCsv(file)
      if (listings.length === 0) {
        setDatasetError('No rows with valid latitude/longitude were found in this file.')
        setLoadingDataset(false)
        return
      }
      setDataset(file.name, listings)
      if (skippedRows > 0) {
        setDatasetError(`Loaded ${listings.length} listings. Skipped ${skippedRows} rows missing lat/lon.`)
      }
    } catch (error) {
      if (error instanceof CsvValidationError) {
        setDatasetError(error.message)
      } else {
        setDatasetError('Could not parse this CSV file.')
      }
      setLoadingDataset(false)
    }
  }

  return (
    <div className="upload-panel">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      <button type="button" className="upload-panel__button" onClick={() => inputRef.current?.click()} disabled={isLoadingDataset}>
        {isLoadingDataset ? 'Loading…' : datasetFileName ? 'Replace CSV' : 'Upload CSV'}
      </button>
      {datasetFileName && (
        <div className="upload-panel__meta">
          {datasetFileName} · {listingCount.toLocaleString()} listings
        </div>
      )}
      {!datasetFileName && projectLastDatasetFileName && (
        <div className="upload-panel__meta">This project's clusters are saved — re-upload {projectLastDatasetFileName} to restore the map.</div>
      )}
      {datasetError && <div className="upload-panel__error">{datasetError}</div>}
    </div>
  )
}
