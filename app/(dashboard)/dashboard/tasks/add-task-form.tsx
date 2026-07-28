'use client';

import { useActionState, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Tag } from 'lucide-react';
import { createTask, createCategory } from './actions';
import type { TaskCategory } from '@/lib/db/schema';
import { useActionToast } from '@/components/use-action-toast';

type ActionState = {
  error?: string;
  success?: string;
};

export function AddTaskForm({ categories }: { categories: TaskCategory[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const result = await createTask(prevState, formData);
      if (!('error' in result)) {
        formRef.current?.reset();
      }
      return result;
    },
    {}
  );

  const [categoryState, categoryFormAction, categoryPending] = useActionState<
    ActionState,
    FormData
  >(
    async (prevState, formData) => {
      const result = await createCategory(prevState, formData);
      if (!('error' in result)) {
        setShowNewCategory(false);
      }
      return result;
    },
    {}
  );

  useActionToast(state);
  useActionToast(categoryState);

  return (
    <div className="mb-6 space-y-3">
      <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-3">
        <Input
          name="title"
          placeholder="Add a new task..."
          required
          maxLength={500}
          className="flex-1"
        />
        <select
          name="categoryId"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none sm:w-40"
          defaultValue=""
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <Input
          name="dueDate"
          type="date"
          className="sm:w-44"
          aria-label="Due date"
        />
        <Button
          type="submit"
          disabled={pending}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Task
            </>
          )}
        </Button>
      </form>
      {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}

      {showNewCategory ? (
        <form action={categoryFormAction} className="flex items-center gap-2">
          <Input
            name="name"
            placeholder="New category name"
            maxLength={50}
            required
            className="max-w-xs"
          />
          <Button type="submit" size="sm" variant="outline" disabled={categoryPending}>
            {categoryPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowNewCategory(false)}
          >
            Cancel
          </Button>
          {categoryState?.error && (
            <p className="text-red-500 text-sm">{categoryState.error}</p>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewCategory(true)}
          className="text-xs text-gray-500 hover:text-orange-600 flex items-center gap-1"
        >
          <Tag className="h-3 w-3" />
          New category
        </button>
      )}
    </div>
  );
}
