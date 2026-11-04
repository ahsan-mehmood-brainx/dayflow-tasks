import { useCallback, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useAppDispatch, useAppSelector } from '@/core/store/hooks';

import { validateCredentials, type CredentialErrors, type Credentials } from '../domain/auth';
import { selectIsSigningIn, selectSignInError } from '../state/authSelectors';
import { signIn, signInErrorDismissed } from '../state/authSlice';

/**
 * Login form state. Field problems are caught locally (same rules as the service) so the user gets
 * instant inline feedback; credential rejection comes from the auth state as a banner.
 */
export function useLoginForm() {
  const dispatch = useAppDispatch();
  const isSigningIn = useAppSelector(selectIsSigningIn);
  const signInError = useAppSelector(selectSignInError);
  const [values, setValues] = useState<Credentials>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});

  const setField = useCallback(
    (field: keyof Credentials, value: string) => {
      setValues((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => (current[field] === undefined ? current : { ...current, [field]: undefined }));
      if (signInError) dispatch(signInErrorDismissed());
    },
    [dispatch, signInError],
  );

  const fill = useCallback(
    (credentials: Credentials) => {
      setValues(credentials);
      setFieldErrors({});
      if (signInError) dispatch(signInErrorDismissed());
    },
    [dispatch, signInError],
  );

  const submit = useCallback(() => {
    const validated = validateCredentials(values);
    if (!validated.ok) {
      setFieldErrors(validated.error);
      const firstError = validated.error.email ?? validated.error.password;
      if (firstError) AccessibilityInfo.announceForAccessibility(firstError);
      return;
    }
    void dispatch(signIn(validated.value));
  }, [dispatch, values]);

  // Field-level messages from the service (validation) are shown inline; everything else as a banner.
  const serviceFieldErrors: CredentialErrors = signInError?.kind === 'validation' ? signInError.fieldErrors : {};
  const errors: CredentialErrors = { ...serviceFieldErrors, ...fieldErrors };
  const bannerError = signInError && signInError.kind !== 'validation' ? signInError : null;

  return { values, errors, bannerError, isSigningIn, setField, fill, submit };
}
