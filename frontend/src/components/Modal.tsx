import React from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

export default function EmptyState({
    title,
    description,
    icon,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white/50 px-6 py-16 text-center">
            {icon && <div className="mb-4 text-slate-300">{icon}</div>}
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}