/**
 * The single account accepted by the simulated sign-in. Shown on the Login screen so reviewers can
 * try the app. This is a training-project convenience, not a credential, and provides no security.
 */
export const DEMO_ACCOUNT = {
  email: 'demo@dayflow.app',
  password: 'dayflow',
  user: {
    id: 'user-demo',
    displayName: 'Alex Rivera',
    email: 'demo@dayflow.app',
  },
} as const;
