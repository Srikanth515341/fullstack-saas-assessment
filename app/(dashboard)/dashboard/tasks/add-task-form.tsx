'use client';

import { useActionState } from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle } from 'lucide-react';
import { createTask } from './actions';

type ActionState = {
  error?: string;
  success?: string;
};

export function AddTaskForm() {
  const formRef = useRef<HTMLFormElement>(null);
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

  return (
    <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-3 mb-6">
      <Input
        name="title"
        placeholder="Add a new task..."
        required
        maxLength={500}
        className="flex-1"
      />
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
      {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
    </form>
  );
}
