/**
 * Form & kontrol admin: input bertoken sama dengan halaman publik, grid field
 * yang dibangkitkan dari schema, modal editor, dan tombol aksi baris.
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ImageUp, LoaderCircle, Trash2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  createOptimizedPhoto,
  formatFileSize,
  isSupportedImageFile,
  MAX_PHOTO_BYTES,
  PHOTO_INPUT_ACCEPT,
} from '../../lib/imageFile'
import { uploadImage } from '../../services/portfolioApi'
import type { AdminField } from '../adminConfig'
import { fieldInputClasses } from './fieldStyles'
import { AdminAlert, AdminIconButton } from './AdminPanels'


interface FormRowProps {
  htmlFor: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

/** Label + hint + pesan galat untuk satu field. */
export function FormRow({
  htmlFor,
  label,
  hint,
  error,
  required = false,
  children,
}: FormRowProps) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold tracking-wide text-navy"
      >
        {label}
        {required ? <span className="ml-1 text-brand-600">*</span> : null}
      </label>

      <div className="mt-2">{children}</div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

interface AdminTextInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  rows?: number
}

/** Input teks tunggal (dipakai form yang tidak memakai schema koleksi). */
export function AdminTextInput({
  id,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
}: AdminTextInputProps) {
  if (multiline) {
    return (
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldInputClasses(false), 'resize-y leading-relaxed')}
      />
    )
  }

  return (
    <input
      id={id}
      type="text"
      value={value}        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldInputClasses(false)}
      />
  )
}

interface FieldControlProps {
  field: AdminField
  value: string
  error?: string
  onChange: (value: string) => void
  tagOptions: Array<{ key: string; label: string }>
}

function FieldControl({
  field,
  value,
  error,
  onChange,
  tagOptions,
}: FieldControlProps) {
  const inputId = `admin-field-${field.name}`

  if (field.type === 'textarea') {
    return (
      <FormRow
        htmlFor={inputId}
        label={field.label}
        hint={field.hint}
        error={error}
        required={field.required}
      >
        <textarea
          id={inputId}
          rows={field.rows ?? 4}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            fieldInputClasses(Boolean(error)),
            'resize-y leading-relaxed',
          )}
        />
      </FormRow>
    )
  }

  if (field.type === 'tags') {
    const selected = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    return (
      <FormRow
        htmlFor={inputId}
        label={field.label}
        hint={field.hint}
        error={error}
        required={field.required}
      >
        {tagOptions.length === 0 ? (
          <p className="text-xs text-slate-400">
            Belum ada filter project. Tambahkan filter terlebih dahulu.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" id={inputId}>
            {tagOptions.map((option) => {
              const isActive = selected.includes(option.key)

              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    onChange(
                      isActive
                        ? selected.filter((key) => key !== option.key).join(', ')
                        : [...selected, option.key].join(', '),
                    )
                  }
                  className={cn(
                    'inline-flex items-center rounded-pill border px-3.5 py-1.5 text-xs font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
                    isActive
                      ? 'border-brand-600 bg-brand-600 text-white shadow-soft'
                      : 'border-line bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </FormRow>
    )
  }

  if (field.type === 'image') {
    return (
      <FormRow
        htmlFor={inputId}
        label={field.label}
        hint={field.hint}
        error={error}
        required={field.required}
      >
        <ImageFieldControl value={value} onChange={onChange} label={field.label} />
      </FormRow>
    )
  }

  const inputType =
    field.type === 'month'
      ? 'month'
      : field.type === 'number'
        ? 'number'
        : 'text'

  return (
    <FormRow
      htmlFor={inputId}
      label={field.label}
      hint={field.hint}
      error={error}
      required={field.required}
    >
      <input
        id={inputId}
        type={inputType}
        value={value}
        placeholder={field.placeholder}
        inputMode={field.type === 'url' ? 'url' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={fieldInputClasses(Boolean(error))}
      />
    </FormRow>
  )
}

interface ImageFieldControlProps {
  value: string
  label: string
  onChange: (value: string) => void
  /**
   * `false` = simpan file apa adanya tanpa dikonversi ke WebP. Dipakai untuk
   * favicon agar format aslinya (PNG/JPG) tetap kompatibel di semua browser.
   */
  optimize?: boolean
  /** Teks bantuan di bawah tombol (mis. batasan ukuran untuk favicon). */
  hint?: string
}

/**
 * Unggah thumbnail: file diperkecil di browser lalu disimpan di server.
 * Dipakai form dengan schema (`AdminFieldGrid`) maupun form khusus.
 */
export function ImageFieldControl({
  value,
  label,
  onChange,
  optimize = true,
  hint,
}: ImageFieldControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setNote(null)

    try {
      let payload: Blob = file

      if (optimize) {
        payload = await createOptimizedPhoto(file)
      } else if (!isSupportedImageFile(file)) {
        throw new Error('Format gambar belum didukung. Gunakan PNG, JPG, atau WebP.')
      } else if (file.size > MAX_PHOTO_BYTES) {
        throw new Error(
          `Ukuran gambar terlalu besar (maks ${formatFileSize(MAX_PHOTO_BYTES)}).`,
        )
      }

      const uploaded = await uploadImage(payload, file.name)
      onChange(uploaded.url)
      setNote(`Terunggah • ${formatFileSize(payload.size)}`)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Gambar gagal diunggah.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0])
    event.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface sm:w-44 sm:shrink-0">
        {value ? (
          <img
            src={value}
            alt={`Pratinjau ${label}`}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageUp aria-hidden="true" className="h-6 w-6" />
          </span>
        )}

        {isUploading ? (
          <span
            role="status"
            className="absolute inset-0 flex items-center justify-center gap-2 bg-navy/70 text-xs font-semibold text-white"
          >
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Mengunggah…
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex h-10 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-semibold text-navy shadow-soft transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ImageUp aria-hidden="true" className="h-4 w-4" />
            {value ? 'Ganti gambar' : 'Unggah gambar'}
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setNote(null)
              }}
              className="inline-flex h-10 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-semibold text-slate-500 transition duration-200 ease-out hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Hapus
            </button>
          ) : null}
        </div>

        {hint ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{hint}</p>
        ) : null}

        {value && !value.startsWith('/uploads/') && !/^https?:/i.test(value) ? (
          <p className="mt-2 truncate text-xs text-slate-400">URL: {value}</p>
        ) : null}

        {error ? (
          <AdminAlert tone="error" className="mt-3">
            {error}
          </AdminAlert>
        ) : note ? (
          <p className="mt-3 text-xs text-slate-400">{note}</p>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_INPUT_ACCEPT}
          onChange={handleChange}
          className="sr-only"
        />
      </div>
    </div>
  )
}

interface AdminFieldGridProps {
  fields: AdminField[]
  values: Record<string, string>
  errors?: Record<string, string>
  onChange: (name: string, value: string) => void
  /** Pilihan untuk field bertipe `tags`. */
  tagOptions?: Array<{ key: string; label: string }>
}

/** Grid field yang dibangkitkan dari schema koleksi. */
export function AdminFieldGrid({
  fields,
  values,
  errors = {},
  onChange,
  tagOptions = [],
}: AdminFieldGridProps) {
  const wideTypes = new Set(['textarea', 'tags', 'image', 'list'])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.name}
          className={cn(
            (field.full || wideTypes.has(field.type)) && 'sm:col-span-2',
          )}
        >
          <FieldControl
            field={field}
            value={values[field.name] ?? ''}
            error={errors[field.name]}
            onChange={(value) => onChange(field.name, value)}
            tagOptions={tagOptions}
          />
        </div>
      ))}
    </div>
  )
}

interface AdminModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Bila diisi, isi modal + footer dibungkus satu `<form>`. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

const modalPanelClasses =
  'relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-white shadow-lift sm:rounded-card'

/** Modal editor (sheet di mobile, dialog di desktop). */
export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  onSubmit,
}: AdminModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const content = (
    <>
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-lg font-bold text-navy"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-slate-500 transition duration-200 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {children}
      </div>

      {footer ? (
        <footer className="border-t border-line bg-surface/70 px-5 py-4 sm:px-6">
          {footer}
        </footer>
      ) : null}
    </>
  )

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
      />

      {onSubmit ? (
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          noValidate
          onSubmit={onSubmit}
          className={modalPanelClasses}
        >
          {content}
        </form>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={modalPanelClasses}
        >
          {content}
        </div>
      )}
    </div>
  )
}

interface AdminFormFooterProps {
  isSaving: boolean
  isDirty?: boolean
  onCancel?: () => void
  cancelLabel?: string
  submitLabel?: string
  /** Status kiri (mis. "Perubahan tersimpan"). */
  status?: ReactNode
}

/** Baris tombol simpan/batal yang dipakai modal dan form halaman. */
export function AdminFormFooter({
  isSaving,
  isDirty = true,
  onCancel,
  cancelLabel = 'Batal',
  submitLabel = 'Simpan',
  status,
}: AdminFormFooterProps) {
  const isDisabled = isSaving || !isDirty

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-h-5 text-xs text-slate-400">{status}</div>

      <div className="flex items-center gap-2 max-sm:flex-col-reverse">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 w-full items-center justify-center rounded-pill border border-line bg-white px-5 text-sm font-semibold text-navy shadow-soft transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:w-auto"
          >
            {cancelLabel}
          </button>
        ) : null}

        <button
          type="submit"
          disabled={isDisabled}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-brand-600 px-5 text-sm font-semibold text-white shadow-soft transition duration-200 ease-out hover:bg-brand-700 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : null}
          {isSaving ? 'Menyimpan…' : submitLabel}
        </button>
      </div>
    </div>
  )
}

interface ConfirmDeleteButtonProps {
  onConfirm: () => void
  disabled?: boolean
  label?: string
}

/** Hapus dengan konfirmasi dua langkah (tanpa `window.confirm`). */
export function ConfirmDeleteButton({
  onConfirm,
  disabled = false,
  label = 'Hapus',
}: ConfirmDeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  if (!isConfirming) {
    return (
      <AdminIconButton
        icon={Trash2}
        label={label}
        tone="danger"
        disabled={disabled}
        onClick={() => setIsConfirming(true)}
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-2 py-1">
      <button
        type="button"
        onClick={() => {
          setIsConfirming(false)
          onConfirm()
        }}
        className="inline-flex h-7 items-center rounded-lg bg-red-600 px-2.5 text-xs font-semibold text-white transition duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
      >
        Ya, hapus
      </button>
      <button
        type="button"
        onClick={() => setIsConfirming(false)}
        className="inline-flex h-7 items-center rounded-lg px-2 text-xs font-semibold text-slate-500 transition duration-200 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
      >
        Batal
      </button>
    </span>
  )
}

/** Tombol aksi ringkas generik (dipakai daftar item). */
export function AdminActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <AdminIconButton
      icon={icon}
      label={label}
      disabled={disabled}
      onClick={onClick}
    />
  )
}
