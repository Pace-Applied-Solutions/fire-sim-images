/**
 * Authentication components for sign-in/sign-out.
 */

import { useAuth } from '../../hooks/useAuth';
import styles from './Auth.module.css';

/**
 * Sign-in button component.
 */
export function SignInButton() {
  const { signIn, isLoading } = useAuth();

  return (
    <button
      onClick={signIn}
      disabled={isLoading}
      className={styles.signInButton}
      type="button"
    >
      {isLoading ? 'Signing in...' : 'Sign In'}
    </button>
  );
}

/**
 * Sign-out button component.
 */
export function SignOutButton() {
  const { signOut, isLoading } = useAuth();

  return (
    <button
      onClick={signOut}
      disabled={isLoading}
      className={styles.signOutButton}
      type="button"
    >
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}

/**
 * User menu component with sign-out option.
 */
export function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className={styles.userMenu}>
      <div className={styles.userInfo}>
        <span className={styles.userName}>{user.name || user.email}</span>
        <span className={styles.userEmail}>{user.email}</span>
      </div>
      <button
        onClick={signOut}
        className={styles.signOutButton}
        type="button"
      >
        Sign Out
      </button>
    </div>
  );
}

/**
 * Auth button that shows sign-in or user menu based on auth state.
 */
export function AuthButton() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <UserMenu />;
  }

  return <SignInButton />;
}
