import { mapStyles } from '@/features/map/mapStyles'
import { useAppStore } from '@/store/useAppStore'

export function StyleSwitcher() {
  const mapStyleId = useAppStore((s) => s.mapStyleId)
  const setMapStyleId = useAppStore((s) => s.setMapStyleId)

  return (
    <div className="map-overlay map-overlay--top-left style-switcher">
      {mapStyles.map((style) => (
        <button
          key={style.id}
          type="button"
          className={`style-switcher__button${style.id === mapStyleId ? ' style-switcher__button--active' : ''}`}
          onClick={() => setMapStyleId(style.id)}
        >
          {style.label}
        </button>
      ))}
    </div>
  )
}
