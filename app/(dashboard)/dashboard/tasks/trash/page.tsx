import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RotateCcw, Trash2, Trash } from 'lucide-react';
import { getDeletedTasksForUser } from '@/lib/db/queries';
import { restoreTask, permanentlyDeleteTask } from '../actions';

export default async function TasksTrashPage() {
  const tasks = await getDeletedTasksForUser();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <Link
        href="/dashboard/tasks"
        className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Trash
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Deleted Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <Trash className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Trash is empty
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Deleted tasks show up here and can be restored.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0"
                >
                  <span className="truncate text-gray-500 line-through">
                    {task.title}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <form action={restoreTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="text-gray-400 hover:text-orange-600 flex items-center gap-1 text-xs"
                        aria-label="Restore task"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    </form>
                    <form action={permanentlyDeleteTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="text-gray-400 hover:text-red-500 flex items-center gap-1 text-xs"
                        aria-label="Delete permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete forever
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
