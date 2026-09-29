import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CircleCheck, LoaderCircle, Send, TriangleAlert } from 'lucide-react'
import Button from './ui/Button'
import { uiCopy } from '../config/siteCopy'
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
} from '../config/contactPolicy'
import { sendContactMessage } from '../services/portfolioApi'
import { cn } from '../lib/cn'

interface FormValues {
  name: string
  email: string
  message: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const initialValues: FormValues = { name: '', email: '', message: '' }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) errors.name = 'Nama wajib diisi.'
  if (!values.email.trim()) {
    errors.email = 'Email wajib diisi.'
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = 'Format email belum benar.'
  }
  const message = values.message.trim()
  if (!message) {
    errors.message = 'Pesan wajib diisi.'
  } else if (message.length < CONTACT_MESSAGE_MIN_LENGTH) {
    errors.message = `Pesan minimal ${CONTACT_MESSAGE_MIN_LENGTH} karakter.`
  }

  return errors
}

interface ContactFormProps {
  /** Catatan kecil di bawah tombol kirim (teks dari tabel `sections`). */
  note: string
}

const fieldBaseClasses =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-navy transition duration-200 ease-out placeholder:text-slate-400 focus:outline-none focus:ring-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

export default function ContactForm({ note }: ContactFormProps) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleChange =
    (field: keyof FormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [field]: value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
      setIsSent(false)
      setSubmitError(null)
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    setSubmitError(null)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      // Pesan disimpan ke database lewat API; dashboard admin membacanya di
      // halaman Contact.
      await sendContactMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
      })
      setIsSent(true)
      setValues(initialValues)
    } catch (cause) {
      setSubmitError(
        cause instanceof Error && cause.message
          ? cause.message
          : 'Pesan gagal dikirim. Coba lagi sebentar lagi.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      aria-busy={isSubmitting}
      noValidate
      className="rounded-card border border-line bg-white p-6 shadow-lift dark:border-slate-700 dark:bg-slate-800 sm:p-7"
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-2 block text-sm font-semibold text-navy dark:text-slate-100"
          >
            {uiCopy.formLabels.name}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={CONTACT_NAME_MAX_LENGTH}
            value={values.name}
            onChange={handleChange('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'contact-name-error' : undefined}
            placeholder="Nama kamu"
            className={cn(
              fieldBaseClasses,
              errors.name
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20'
                : 'border-line focus:border-brand-600 focus:ring-brand-100 dark:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-500/20',
            )}
          />
          {errors.name ? (
            <p id="contact-name-error" className="mt-1.5 text-xs text-red-500">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="mb-2 block text-sm font-semibold text-navy dark:text-slate-100"
          >
            {uiCopy.formLabels.email}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={CONTACT_EMAIL_MAX_LENGTH}
            value={values.email}
            onChange={handleChange('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
            placeholder="nama@email.com"
            className={cn(
              fieldBaseClasses,
              errors.email
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20'
                : 'border-line focus:border-brand-600 focus:ring-brand-100 dark:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-500/20',
            )}
          />
          {errors.email ? (
            <p id="contact-email-error" className="mt-1.5 text-xs text-red-500">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="mb-2 block text-sm font-semibold text-navy dark:text-slate-100"
          >
            {uiCopy.formLabels.message}
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={4}
            maxLength={CONTACT_MESSAGE_MAX_LENGTH}
            value={values.message}
            onChange={handleChange('message')}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={
              errors.message ? 'contact-message-error' : undefined
            }
            placeholder="Tulis pesan singkat kamu di sini..."
            className={cn(
              fieldBaseClasses,
              'resize-none',
              errors.message
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20'
                : 'border-line focus:border-brand-600 focus:ring-brand-100 dark:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-500/20',
            )}
          />
          {errors.message ? (
            <p
              id="contact-message-error"
              className="mt-1.5 text-xs text-red-500"
            >
              {errors.message}
            </p>
          ) : null}
        </div>
      </div>

      <Button
        type="submit"
        icon={isSubmitting ? LoaderCircle : Send}
        iconPosition="left"
        iconClassName={isSubmitting ? 'animate-spin' : undefined}
        disabled={isSubmitting}
        fullWidth
        className="mt-6"
      >
        {isSubmitting ? 'Mengirim…' : uiCopy.sendMessage}
      </Button>

      <div aria-live="polite" className="mt-4 space-y-2">
        {isSent ? (
          <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            Terima kasih! Pesanmu sudah terkirim dan tersimpan di dashboard
            admin.
          </p>
        ) : null}
        {submitError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </p>
        ) : null}
        {note ? (
          <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-400">{note}</p>
        ) : null}
      </div>
    </form>
  )
}
