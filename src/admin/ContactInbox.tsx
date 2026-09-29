/**
 * Inbox pesan dari form Contact di halaman publik.
 *
 * Ditampilkan di halaman Contact, di bawah daftar kanal kontak. Datanya dibaca
 * dari endpoint admin `/api/contact-messages`, jadi hanya bisa dibuka oleh akun
 * dengan role admin yang sudah login.
 */

import { useState } from 'react'
import { Inbox, Mail, MailOpen, RefreshCw, Reply } from 'lucide-react'
import Button from '../components/ui/Button'
import { formatDateTime, formatRelativeTime } from '../lib/formatDate'
import { cn } from '../lib/cn'
import type { ContactMessage } from '../types/portfolio'
import { useContactInbox } from './hooks/useContactInbox'
import { ConfirmDeleteButton } from './ui/AdminForm'
import {
  AdminAlert,
  AdminEmptyState,
  AdminIconButton,
  AdminPanel,
  AdminSkeletonRows,
} from './ui/AdminPanels'

export default function ContactInbox() {
  const { status, messages, unread, error, isRefreshing, reload, markRead, remove } =
    useContactInbox()
  /** Pesan yang sedang diproses + galat dari aksi terakhir (tandai/hapus). */
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleToggleRead = async (message: ContactMessage) => {
    setBusyId(message.id)
    setActionError(await markRead(message.id, !message.is_read))
    setBusyId(null)
  }

  const handleDelete = async (id: number) => {
    setBusyId(id)
    setActionError(await remove(id))
    setBusyId(null)
  }

  const visibleError = actionError ?? error

  return (
    <AdminPanel
      title="Pesan masuk"
      description={
        status === 'ready'
          ? messages.length === 0
            ? 'Kiriman dari form Contact di halaman publik akan muncul di sini.'
            : `${messages.length} pesan • ${unread} belum dibaca`
          : 'Kiriman dari form Contact di halaman publik.'
      }
      actions={
        <>
          {unread > 0 ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-brand-50 px-3.5 text-xs font-semibold text-brand-700">
              <Mail aria-hidden="true" className="h-3.5 w-3.5" />
              {unread} baru
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void reload()}
            disabled={isRefreshing}
            icon={RefreshCw}
            iconPosition="left"
            iconClassName={isRefreshing ? 'animate-spin' : undefined}
          >
            {isRefreshing ? 'Memuat…' : 'Muat ulang'}
          </Button>
        </>
      }
      bodyClassName={status === 'ready' && messages.length > 0 ? 'p-0 sm:p-0' : undefined}
    >
      {visibleError ? (
        <AdminAlert
          tone="error"
          className={messages.length > 0 ? 'm-5 sm:m-6' : undefined}
        >
          {visibleError}
        </AdminAlert>
      ) : null}

      {status === 'loading' ? (
        <AdminSkeletonRows rows={3} />
      ) : status === 'error' && messages.length === 0 ? null : messages.length === 0 ? (
        <AdminEmptyState
          icon={Inbox}
          title="Belum ada pesan masuk"
          description="Setiap pesan yang dikirim lewat form Contact di halaman publik akan langsung tersimpan di sini."
        />
      ) : (
        <ul
          className={cn(
            'divide-y divide-line',
            visibleError ? 'border-t border-line' : null,
          )}
        >
          {messages.map((message) => {
            const isBusy = busyId === message.id

            return (
              <li
                key={message.id}
                className={cn(
                  'px-5 py-4 transition duration-200 sm:px-6',
                  message.is_read ? 'bg-white' : 'bg-brand-50/50',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
                      {message.name}
                      {message.is_read ? null : (
                        <span className="rounded-pill bg-brand-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                          Baru
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      <a
                        href={`mailto:${message.email}`}
                        className="font-medium text-slate-500 transition duration-200 hover:text-brand-700"
                      >
                        {message.email}
                      </a>
                      {' • '}
                      {formatRelativeTime(message.created_at)}
                      {message.created_at
                        ? ` • ${formatDateTime(message.created_at)}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      href={`mailto:${message.email}?subject=${encodeURIComponent(
                        'Balasan untuk pesanmu di portfolio',
                      )}`}
                      icon={Reply}
                      iconPosition="left"
                    >
                      Balas
                    </Button>

                    <AdminIconButton
                      icon={message.is_read ? Mail : MailOpen}
                      label={
                        message.is_read
                          ? 'Tandai belum dibaca'
                          : 'Tandai sudah dibaca'
                      }
                      onClick={() => void handleToggleRead(message)}
                      disabled={isBusy}
                    />

                    <ConfirmDeleteButton
                      onConfirm={() => void handleDelete(message.id)}
                      disabled={isBusy}
                      label="Hapus pesan"
                    />
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-slate-600">
                  {message.message}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </AdminPanel>
  )
}
