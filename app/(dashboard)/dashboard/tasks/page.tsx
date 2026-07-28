import Link from 'next/link';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Trash2, ListTodo, Download, Trash } from 'lucide-react';
import { getTasksForUser, getTaskCategoriesForUser, type TaskFilter } from '@/lib/db/queries';
import { getDictionary, parseLocale } from '@/lib/i18n/dictionaries';
import { AddTaskForm } from './add-task-form';
import { TaskFilters } from './task-filters';
import { toggleTask, deleteTask } from './actions';
import { RealtimeTaskRefresh } from './realtime-refresh';
import { SuggestTasksButton } from './suggest-tasks-button';

function formatDueDate(dueDate: Date | null, locale: string) {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString(locale, {
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

  const locale = parseLocale((await cookies()).get('locale')?.value);
  const t = getDictionary(locale);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <RealtimeTaskRefresh />
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        {t.tasks.title}
      </h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t.tasks.myTasks}</CardTitle>
          <div className="flex items-center gap-3">
            <SuggestTasksButton
              existingTitles={tasks.map((task) => task.title)}
              categories={categories}
              label={t.tasks.suggestTasks}
            />
            <Link
              href="/api/export/tasks"
              className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900"
            >
              <Download className="h-3.5 w-3.5" />
              {t.tasks.exportCsv}
            </Link>
            <Link
              href="/dashboard/tasks/trash"
              className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900"
            >
              <Trash className="h-3.5 w-3.5" />
              {t.tasks.trash}
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
                {hasActiveFilters ? t.tasks.noMatchingTasks : t.tasks.noTasks}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {hasActiveFilters ? t.tasks.noMatchingTasksHint : t.tasks.noTasksHint}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task) => {
                const category = categories.find((c) => c.id === task.categoryId);
                const priorityColor =
                  task.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : task.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600';
                return (
                  <li
                    key={task.id}
                    className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0"
                  >
                    <form action={toggleTask} className="flex items-start gap-3 flex-1 min-w-0">
                      <input type="hidden" name="taskId" value={task.id} />
                      <button type="submit" className="shrink-0 mt-0.5" aria-label="Toggle task completion">
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                          {task.priority && (
                            <span
                              className={`text-xs rounded-full px-2 py-0.5 shrink-0 capitalize ${priorityColor}`}
                            >
                              {task.priority}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-gray-500 shrink-0">
                              {formatDueDate(task.dueDate, locale)}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
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
