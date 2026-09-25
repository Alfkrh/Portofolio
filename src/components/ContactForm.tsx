import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CircleCheck, Send } from 'lucide-react'
import Button from './ui/Button'
import { uiCopy } from '../config/siteCopy'
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
  if (!values.message.trim()) errors.message = 'Pesan wajib diisi.'

  return errors
}

interface ContactFormProps {
  /** Small note explaining that the form is not wired to a backend yet. */
  note: string
}

const fieldBaseClasses =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-navy transition duration-200 ease-out placeholder:text-slate-400 focus:outline-none focus:ring-4'

export default function ContactForm({ note }: ContactFormProps) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSent, setIsSent] = useState(false)

  const handleChange =
    (field: keyof FormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [field]: value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
      setIsSent(false)
    }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    // Tidak ada backend pada tahap ini — pesan hanya dikonfirmasi di UI.
    setIsSent(true)
    setValues(initialValues)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-card border border-line bg-white p-6 shadow-lift sm:p-7"
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-2 block text-sm font-semibold text-navy"
          >
            {uiCopy.formLabels.name}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={handleChange('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'contact-name-error' : undefined}
            placeholder="Nama kamu"
            className={cn(
              fieldBaseClasses,
              errors.name
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-line focus:border-brand-600 focus:ring-brand-100',
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
            className="mb-2 block text-sm font-semibold text-navy"
          >
            {uiCopy.formLabels.email}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
            placeholder="nama@email.com"
            className={cn(
              fieldBaseClasses,
              errors.email
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-line focus:border-brand-600 focus:ring-brand-100',
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
            className="mb-2 block text-sm font-semibold text-navy"
          >
            {uiCopy.formLabels.message}
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={4}
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
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-line focus:border-brand-600 focus:ring-brand-100',
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
        icon={Send}
        iconPosition="left"
        fullWidth
        className="mt-6"
      >
        {uiCopy.sendMessage}
      </Button>

      <div aria-live="polite" className="mt-4 space-y-2">
        {isSent ? (
          <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-700">
            <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            Terima kasih! Pesanmu sudah tercatat di halaman ini.
          </p>
        ) : null}
        {note ? (
          <p className="text-xs leading-relaxed text-slate-400">{note}</p>
        ) : null}
      </div>
    </form>
  )
}
