import React from 'react';

interface EmptyStateProps {
  /** Optional icon element, e.g. <MegaphoneIcon className="h-10 w-10" /> */
  icon?: React.ReactNode;
  /** Short bold heading, e.g. "No announcements yet" */
  title: string;
  /** Supporting sentence under the title */
  message?: string;
  /** Optional call-to-action button */
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {message && (
        <p className="mt-1 text-sm text-gray-500 max-w-sm">{message}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}