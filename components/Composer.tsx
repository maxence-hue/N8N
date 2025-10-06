'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILES = 5;
const MAX_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? process.env.MAX_UPLOAD_MB ?? 20);
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/heif'
];

export interface ComposerAttachment {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'file';
}

interface ComposerProps {
  onSend: (text: string, attachments: ComposerAttachment[]) => Promise<void>;
  attachments: ComposerAttachment[];
  onAddAttachments: (attachments: ComposerAttachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  totalAttachmentSize: number;
  disabled?: boolean;
}

export function Composer({
  onSend,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  totalAttachmentSize,
  disabled = false
}: ComposerProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const addFiles = useCallback(
    (files: File[]) => {
      if (disabled) return;
      const existingCount = attachments.length;
      const availableSlots = MAX_FILES - existingCount;
      const limited = files.slice(0, availableSlots);

      const nextAttachments = limited.map((file) => {
        const kind: 'image' | 'file' = file.type.startsWith('image/') ? 'image' : 'file';
        return {
          id: uuidv4(),
          file,
          previewUrl: kind === 'image' ? URL.createObjectURL(file) : '',
          kind
        } satisfies ComposerAttachment;
      });
      onAddAttachments(nextAttachments);
    },
    [attachments.length, disabled, onAddAttachments]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;
      addFiles(acceptedFiles);
    },
    [addFiles, disabled]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES.reduce<Record<string, string[]>>((acc, type) => {
      acc[type] = [];
      return acc;
    }, {}),
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    noClick: true,
    multiple: true,
    disabled
  });

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!disabled) {
        void submit();
      }
    }
  };

  const submit = useCallback(async () => {
    if (isSending || disabled) return;
    if (!text.trim() && attachments.length === 0) return;
    setIsSending(true);
    try {
      await onSend(text, attachments);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error(error);
      alert("Impossible d'envoyer le message. Merci de réessayer.");
    } finally {
      setIsSending(false);
    }
  }, [attachments, disabled, isSending, onSend, text]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled) {
      void submit();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = event.target.files;
    if (!files) return;
    addFiles(Array.from(files));
    event.target.value = '';
  };

  const totalSizeMB = useMemo(() => (totalAttachmentSize / (1024 * 1024)).toFixed(2), [totalAttachmentSize]);
  const isOverLimit = totalAttachmentSize > MAX_SIZE_MB * 1024 * 1024;

  return (
    <div
      className="sticky bottom-0 z-10 flex w-full flex-col gap-2 border-t border-slate-200 bg-white/80 p-4 backdrop-blur"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <div
        {...getRootProps({
          className: clsx(
            'rounded-lg border border-dashed border-slate-300 p-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            isDragActive ? 'border-primary bg-blue-50' : 'bg-white',
            disabled && 'cursor-not-allowed opacity-60'
          )
        })}
        aria-label="Zone de dépôt des pièces jointes"
        aria-disabled={disabled}
      >
        <input {...getInputProps()} aria-label="Ajouter des pièces jointes" />
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => !disabled && open()}
              disabled={disabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Ajouter une pièce jointe"
            >
              +
            </button>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Écrire un message..."
              className="max-h-32 min-h-[48px] w-full resize-none overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-inner focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100"
              aria-label="Zone de saisie du message"
              disabled={disabled}
            />
            <button
              type="submit"
              className="button-primary flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || isSending || (!text.trim() && attachments.length === 0) || isOverLimit}
              aria-label="Envoyer le message"
            >
              ➤
            </button>
          </div>
          <input
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileChange}
            className="hidden"
            aria-hidden
            disabled={disabled}
          />
        </form>
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-live="polite">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm"
            >
              {attachment.kind === 'image' ? (
                <Image
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover"
                  unoptimized
                />
              ) : (
                <span aria-hidden className="inline-flex h-12 w-12 items-center justify-center rounded bg-slate-100">
                  📄
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{attachment.file.name}</span>
                <span className="text-slate-500">{(attachment.file.size / 1024 / 1024).toFixed(2)} Mo</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                className="rounded-full border border-transparent p-1 text-slate-500 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={`Retirer ${attachment.file.name}`}
              >
                ✕
              </button>
            </div>
          ))}
          <span className={clsx('text-xs', isOverLimit ? 'text-red-600' : 'text-slate-500')}>
            Total: {totalSizeMB} Mo (max {MAX_SIZE_MB} Mo)
          </span>
          {isOverLimit && <span className="text-xs text-red-600">Limite dépassée, retirez un fichier.</span>}
        </div>
      )}
    </div>
  );
}
