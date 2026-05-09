interface AdminDatabaseUnavailableStateProps {
  title: string;
  description: string;
}

export default function AdminDatabaseUnavailableState({
  title,
  description,
}: AdminDatabaseUnavailableStateProps) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">
        Data unavailable
      </p>
      <h2 className="mt-2 text-xl font-bold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <p className="mt-4 text-sm text-amber-700">
        Please refresh after the database connection is restored.
      </p>
    </div>
  );
}
