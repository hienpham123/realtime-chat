import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPassword } from '@/services/auth-service';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-teams-canvas px-4 py-12">
      <div className="w-full max-w-md rounded border border-teams-border bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded bg-primary text-sm font-bold text-white">
            RC
          </div>
          <h1 className="text-2xl font-semibold text-teams-text">Sign in</h1>
          <p className="mt-2 text-sm text-teams-text-secondary">
            Use your work or school account to continue
          </p>
        </div>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          {error ? (
            <p
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-xs font-semibold text-teams-text-secondary"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded border border-teams-border bg-white px-4 py-2.5 text-sm text-teams-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-xs font-semibold text-teams-text-secondary"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded border border-teams-border bg-white px-4 py-2.5 text-sm text-teams-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-teams-text-secondary">
          No account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};
