import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle } from 'lucide-react'
import { apiUrl, getToken, ApiError } from '../../lib/api'
import { useLang } from '../../i18n/LanguageContext'
import './ImageUpload.css'

type Props = {
  value: string
  onChange: (url: string) => void
  label?: string
}

export function ImageUpload({ value, onChange, label }: Props) {
  const { locale } = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const copy =
    locale === 'ru'
      ? {
          pick: 'Загрузить фото',
          clear: 'Убрать',
          hint: 'JPG, PNG, WEBP · до 8 МБ · с телефона или ПК',
          uploading: 'Загрузка…',
        }
      : {
          pick: 'Foto hochladen',
          clear: 'Entfernen',
          hint: 'JPG, PNG, WEBP · max. 8 MB · Handy oder PC',
          uploading: 'Hochladen…',
        }

  const upload = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const token = getToken()
      const res = await fetch(`${apiUrl}/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      })
      if (!res.ok) {
        let message = res.statusText
        try {
          const data = (await res.json()) as { error?: string }
          if (data.error) message = data.error
        } catch {
          /* ignore */
        }
        throw new ApiError(res.status, message)
      }
      const data = (await res.json()) as { url: string }
      onChange(data.url)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="image-upload">
      {label && <span className="image-upload__label">{label}</span>}
      <div className="image-upload__row">
        <div className="image-upload__preview">
          {value ? (
            <img src={value} alt="" />
          ) : (
            <div className="image-upload__placeholder">
              <ImagePlus size={22} />
            </div>
          )}
        </div>
        <div className="image-upload__actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void upload(file)
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <LoaderCircle size={16} className="spin" /> : <ImagePlus size={16} />}
            {uploading ? copy.uploading : copy.pick}
          </button>
          {value ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={uploading}
              onClick={() => onChange('')}
            >
              {copy.clear}
            </button>
          ) : null}
          <p className="image-upload__hint">{copy.hint}</p>
          {error && <p className="image-upload__error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
