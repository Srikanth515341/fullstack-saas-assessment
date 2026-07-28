import Link from 'next/link';
import type { TaskFilter } from '@/lib/db/queries';
import type { TaskCategory } from '@/lib/db/schema';

function buildHref(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const query = searchParams.toString();
  return query ? `/dashboard/tasks?${query}` : '/dashboard/tasks';
}

const FILTER_TABS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' }
];

export function TaskFilters({
  search,
  filter,
  categoryId,
  categories
}: {
  search?: string;
  filter: TaskFilter;
  categoryId?: number;
  categories: TaskCategory[];
}) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <form method="GET" className="flex gap-3">
        <input
          type="hidden"
          name="filter"
          value={filter !== 'all' ? filter : ''}
        />
        {categoryId && (
          <input type="hidden" name="category" value={categoryId} />
        )}
        <input
          type="search"
          name="q"
          placeholder="Search tasks..."
          defaultValue={search}
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref({
              q: search,
              filter: tab.value !== 'all' ? tab.value : undefined,
              category: categoryId?.toString()
            })}
            className={`text-xs rounded-full px-3 py-1 border ${
              filter === tab.value
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </Link>
        ))}

        {categories.length > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <Link
              href={buildHref({
                q: search,
                filter: filter !== 'all' ? filter : undefined
              })}
              className={`text-xs rounded-full px-3 py-1 border ${
                !categoryId
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All categories
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildHref({
                  q: search,
                  filter: filter !== 'all' ? filter : undefined,
                  category: cat.id.toString()
                })}
                className={`text-xs rounded-full px-3 py-1 border ${
                  categoryId === cat.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
