import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Trash2, ListTodo, Download, Trash } from 'lucide-react';
import { getTasksForUser, getTaskCategoriesForUser, type TaskFilter } from '@/lib/db/queries';
import { AddTaskForm } from './add-task-form';
import { TaskFilters } from './task-filters';
import { toggleTask, deleteTask } from './actions';

function formatDueDate(dueDate: Date | null) {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

const VALID_FILTERS: TaskFilter[] = ['all', 'active', 'completed'];

export default async function TasksPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; filter?: string; category?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const filter: TaskFilter = VALID_FILTERS.includes(params.filter as TaskFilter)
    ? (params.filter as TaskFilter)
    : 'all';
  const categoryId = params.category ? Number(params.category) : undefined;

  const [tasks, categories] = await Promise.all([
    getTasksForUser({ search, filter, categoryId }),
    getTaskCategoriesForUser()
  ]);

  const hasActiveFilters = Boolean(search) || filter !== 'all' || Boolean(categoryId);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Tasks
      </h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Tasks</CardTitle>
          <div className="flex items-center gap-3">
            <Link
              href="/api/export/tasks"
              className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Link>
            <Link
              href="/dashboard/tasks/trash"
              className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900"
            >
              <Trash className="h-3.5 w-3.5" />
              Trash
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <AddTaskForm categories={categories} />
          <TaskFilters
            search={search}
            filter={filter}
            categoryId={categoryId}
            categories={categories}
          />

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <ListTodo className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasActiveFilters ? 'No matching tasks' : 'No tasks yet'}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {hasActiveFilters
                  ? 'Try a different search term or clear your filters.'
                  : 'Add your first task above to get started.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task) => {
                const category = categories.find((c) => c.id === task.categoryId);
                return (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0"
                  >
                    <form action={toggleTask} className="flex items-center gap-3 flex-1 min-w-0">
                      <input type="hidden" name="taskId" value={task.id} />
                      <button type="submit" className="shrink-0" aria-label="Toggle task completion">
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <span
                        className={`truncate ${
                          task.completed ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      {category && (
                        <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 shrink-0">
                          {category.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-gray-500 shrink-0">
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                    </form>
                    <form action={deleteTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="text-gray-400 hover:text-red-500 shrink-0"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
