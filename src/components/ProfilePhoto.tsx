import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode } from 'react'
import {
  Camera,
  Eye,
  GraduationCap,
  ImageUp,
  LoaderCircle,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Profile } from '../types/portfolio'
import { useProfilePhoto } from '../hooks/useProfilePhoto'
import {
  formatFileSize,
  MAX_PHOTO_BYTES,
  PHOTO_INPUT_ACCEPT,
} from '../lib/imageFile'
import { uiCopy } from '../config/siteCopy'
import IconTile from './ui/IconTile'
import PhotoLightbox from './PhotoLightbox'
import { cn } from '../lib/cn'

const PHOTO_INPUT_ID = 'profile-photo-input'
const STATUS_ID = 'profile-photo-status'

interface PhotoActionButtonProps {
  label: string
  icon: LucideIcon
  onClick: () => void
  tone?: 'neutral' | 'danger'
  describedBy?: string
}

/** Tombol overlay ringkas untuk aksi preview / change / remove. */
function PhotoActionButton({
  label,
  icon: Icon,
  onClick,
  tone = 'neutral',
  describedBy,
}: PhotoActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-describedby={describedBy}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white/90 shadow-soft backdrop-blur-sm transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5',
        tone === 'danger'
          ? 'border-line text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
          : 'border-line text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  )
}

interface StatusLineProps {
  children: ReactNode
  tone?: 'default' | 'error'
}

function StatusLine({ children, tone = 'default' }: StatusLineProps) {
  return (
    <p
      id={STATUS_ID}
      className={cn(
        'inline-flex items-center justify-center gap-2 text-xs',
        tone === 'error' ? 'font-medium text-red-500' : 'text-slate-400',
      )}
    >
      {children}
    </p>
  )
}

interface ProfilePhotoProps {
  profile: Profile
  /** Nama institusi untuk kartu kecil di area foto. */
  institution?: string
  /** Dipanggil setelah foto tersimpan di server. */
  onPhotoChanged: () => Promise<void> | void
}

/**
 * Area foto profil di Hero.
 *
 * Foto tersimpan di storage server (`/uploads/...`) sehingga semua pengunjung
 * melihat foto yang sama dan bisa diganti tanpa mengubah source code.
 */
export default function ProfilePhoto({
  profile,
  institution,
  onPhotoChanged,
}: ProfilePhotoProps) {
  const {
    photoUrl,
    isProcessing,
    error,
    details,
    uploadPhoto,
    removePhoto,
  } = useProfilePhoto(profile, onPhotoChanged)

  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

  const openFilePicker = () => inputRef.current?.click()

  const acceptFile = (file: File | null | undefined) => {
    if (!file) return
    void uploadPhoto(file)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0])
    // Reset agar memilih file yang sama lagi tetap memicu event change.
    event.target.value = ''
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const previewCaption = details
    ? `${details.name} • ${formatFileSize(details.size)}`
    : undefined

  return (
    <div>
      <div className="relative mx-auto w-full max-w-sm">
        {/* Pelat dekoratif di belakang foto. */}
        <div
          aria-hidden="true"
          className="absolute -inset-3 rounded-[2.25rem] bg-brand-50 motion-safe:rotate-3"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-5 -left-3 h-16 w-16 rounded-full border border-brand-100 bg-white/70 backdrop-blur-sm"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'group relative aspect-square w-full overflow-hidden rounded-[2rem] border bg-white shadow-soft transition duration-300 ease-out',
            isDragging ? 'border-brand-600 ring-4 ring-brand-100' : 'border-line',
          )}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Foto ${profile.name}`}
              decoding="async"
              className="h-full w-full object-cover transition duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
            />
          ) : (
            /* Placeholder — sekaligus tombol untuk mengunggah foto. */
            <button
              type="button"
              onClick={openFilePicker}
              aria-describedby={STATUS_ID}
              className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center transition duration-200 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 font-display text-3xl font-extrabold tracking-tight text-brand-600">
                {initials}
              </span>
              <span className="text-xs font-medium text-slate-400">
                Foto profil belum ditambahkan
              </span>
              <span className="inline-flex h-10 items-center gap-2 rounded-pill bg-brand-600 px-4 text-sm font-semibold text-white shadow-soft">
                <ImageUp aria-hidden="true" className="h-4 w-4" />
                {uiCopy.uploadPhoto}
              </span>
            </button>
          )}

          {isDragging ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-brand-600/85 text-center text-sm font-semibold text-white"
            >
              Lepaskan foto untuk mengunggah
            </div>
          ) : null}

          {isProcessing ? (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy/70 text-xs font-semibold text-white"
            >
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              Mengunggah foto…
            </div>
          ) : null}

          {photoUrl && !isProcessing ? (
            <>
              <div className="absolute top-3 right-3">
                <PhotoActionButton
                  label={uiCopy.previewPhoto}
                  icon={Eye}
                  describedBy={STATUS_ID}
                  onClick={() => setIsPreviewOpen(true)}
                />
              </div>

              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <PhotoActionButton
                  label={uiCopy.changePhoto}
                  icon={Camera}
                  describedBy={STATUS_ID}
                  onClick={openFilePicker}
                />
                <PhotoActionButton
                  label={uiCopy.removePhoto}
                  icon={Trash2}
                  tone="danger"
                  describedBy={STATUS_ID}
                  onClick={() => void removePhoto()}
                />
              </div>
            </>
          ) : null}
        </div>

        {institution ? (
          <div className="absolute -bottom-4 left-4 z-10 flex items-center gap-2.5 rounded-2xl border border-line bg-white/95 px-3.5 py-2.5 shadow-soft backdrop-blur-sm sm:left-6">
            <IconTile icon={GraduationCap} size="sm" tone="soft" />
            <span className="text-left">
              <span className="block text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                Education
              </span>
              <span className="block text-xs font-semibold text-navy">
                {institution}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {/* Status langsung ke screen reader & pengguna. */}
      <div className="mt-14 flex justify-center" aria-live="polite">
        {error ? (
          <StatusLine tone="error">
            <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
            {error}
          </StatusLine>
        ) : isProcessing ? (
          <StatusLine>
            <LoaderCircle
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin"
            />
            Mengunggah foto…
          </StatusLine>
        ) : details ? (
          <StatusLine>
            Foto tersimpan di server • {details.name} •{' '}
            {formatFileSize(details.size)}
          </StatusLine>
        ) : photoUrl ? (
          <StatusLine>Foto profil aktif • tampil 1:1 otomatis</StatusLine>
        ) : (
          <StatusLine>
            JPG, PNG, atau WebP • maks {formatFileSize(MAX_PHOTO_BYTES)} • tampil
            1:1 otomatis
          </StatusLine>
        )}
      </div>

      <input
        ref={inputRef}
        id={PHOTO_INPUT_ID}
        type="file"
        accept={PHOTO_INPUT_ACCEPT}
        onChange={handleInputChange}
        aria-describedby={STATUS_ID}
        className="sr-only"
      />

      {photoUrl && isPreviewOpen ? (
        <PhotoLightbox
          src={photoUrl}
          alt={`Foto ${profile.name}`}
          caption={previewCaption}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </div>
  )
}
