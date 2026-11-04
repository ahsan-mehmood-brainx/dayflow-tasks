import { useCallback, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import type { ActionOutcome } from '@/core/store/runAction';
import type { AppError } from '@/shared/lib/appError';

import type { Task, TaskDraft, TaskDraftErrors, TaskDraftField } from '../../domain/task';
import { validateTaskDraft } from '../../domain/taskRules';

const FIELD_ORDER: readonly TaskDraftField[] = ['title', 'description', 'priority', 'dueDate'];

interface UseTaskFormOptions {
  readonly initialDraft: TaskDraft;
  readonly submit: (draft: TaskDraft) => Promise<ActionOutcome<Task>>;
  readonly onSucceeded: (task: Task) => void;
  /** Called with the first invalid field so the screen can move focus to it. */
  readonly onInvalid?: (field: TaskDraftField) => void;
}

/**
 * Form state for creating and editing tasks. Validation is the domain's `validateTaskDraft`, so the
 * form shows exactly the rules the repositories enforce. Errors appear after a field is left or
 * after the first submit attempt, not while the user is still typing.
 */
export function useTaskForm({ initialDraft, submit, onSucceeded, onInvalid }: UseTaskFormOptions) {
  const [values, setValues] = useState<TaskDraft>(initialDraft);
  const [touched, setTouched] = useState<Partial<Record<TaskDraftField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const [serverErrors, setServerErrors] = useState<TaskDraftErrors>({});

  const validation = useMemo(() => validateTaskDraft(values), [values]);
  const validationErrors = useMemo<TaskDraftErrors>(() => (validation.ok ? {} : validation.error), [validation]);

  const errors = useMemo(() => {
    const visible: TaskDraftErrors = {};
    for (const field of FIELD_ORDER) {
      const message = serverErrors[field] ?? ((submitAttempted || touched[field]) ? validationErrors[field] : undefined);
      if (message !== undefined) visible[field] = message;
    }
    return visible;
  }, [serverErrors, submitAttempted, touched, validationErrors]);

  const isDirty = useMemo(() => FIELD_ORDER.some((field) => values[field] !== initialDraft[field]), [values, initialDraft]);

  const setField = useCallback(<F extends TaskDraftField>(field: F, value: TaskDraft[F]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => (current[field] === undefined ? current : { ...current, [field]: undefined }));
    setSubmitError(null);
  }, []);

  const markTouched = useCallback((field: TaskDraftField) => {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitAttempted(true);
    setSubmitError(null);

    if (!validation.ok) {
      const firstInvalid = FIELD_ORDER.find((field) => validation.error[field] !== undefined);
      if (firstInvalid) {
        onInvalid?.(firstInvalid);
        AccessibilityInfo.announceForAccessibility(validation.error[firstInvalid] ?? 'Check the highlighted fields.');
      }
      return;
    }

    const outcome = await submit(validation.value);
    if (outcome.status === 'succeeded') {
      onSucceeded(outcome.value);
    } else if (outcome.status === 'failed') {
      setSubmitError(outcome.error);
      if (outcome.error.kind === 'validation') setServerErrors(outcome.error.fieldErrors);
    }
  }, [validation, submit, onSucceeded, onInvalid]);

  return { values, errors, isDirty, submitError, setField, markTouched, handleSubmit };
}
