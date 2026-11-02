import { lazy, Suspense, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  Files,
  UserRound,
  Settings as SettingsIcon,
  Sparkles,
  ArrowRight,
  LogOut,
  Menu,
  X,
  LoaderCircle,
  Leaf,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api, emptyProfile, normalizeProfile } from '../lib/api.js';
import { Button, Card, Field, Input, ErrorNote } from '../components/ui/index.jsx';

const Dashboard = lazy(() => import('../features/dashboard/Dashboard.jsx'));

const Profile = lazy(() => import('../features/profile/Profile.jsx'));

const Preparation = lazy(() => import('../features/preparation/Preparation.jsx'));

const Applications = lazy(() => import('../features/applications/Applications.jsx'));

const Documents = lazy(() => import('../features/documents/Documents.jsx'));

const Settings = lazy(() => import('../features/settings/Settings.jsx'));

const nav = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['applications', 'Applications', BriefcaseBusiness],
  ['preparation', 'Prepare application', Sparkles],
  ['resumes', 'Resumes / CVs', Files],
  ['letters', 'Cover letters', FileText],
  ['profile', 'Career profile', UserRound]
];

function initialPage() {
  const page = location.hash.slice(1);
  return [...nav.map((n) => n[0]), 'settings'].includes(page) ? page : 'dashboard';
}

export default function App() {
  const [user, setUser] = useState(null),
    [health, setHealth] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [page, setPage] = useState(initialPage),
    [mobile, setMobile] = useState(false),
    [profile, setProfile] = useState(emptyProfile()),
    [applications, setApplications] = useState([]),
    [documents, setDocuments] = useState([]),
    [draft, setDraft] = useState({}),
    [settings, setSettings] = useState({}),
    [filter, setFilter] = useState('');

  async function load() {
    const [p, a, d, prep, s] = await Promise.all([
      api('/profile'),
      api('/applications'),
      api('/documents'),
      api('/preparation'),
      api('/settings')
    ]);
    setProfile(normalizeProfile(p));
    setApplications(a);
    setDocuments(d);
    setDraft(prep);
    setSettings(s);
  }

  async function boot() {
    setLoading(true);
    setError('');
    try {
      const h = await api('/health');
      setHealth(h);
      const s = await api('/auth/session');
      setUser(s.user);
      if (s.user) {
        await load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
    const fn = () => setPage(initialPage());
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);

  function navigate(next, status = '') {
    setFilter(status);
    setPage(next);
    location.hash = next;
    setMobile(false);
    window.scrollTo(0, 0);
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setProfile(emptyProfile());
      setApplications([]);
      setDocuments([]);
      setDraft({});
      sessionStorage.removeItem('folio-preparation-recovery');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Leaf size={32} className="text-brand" />
        <LoaderCircle size={22} className="animate-spin text-brand" />
        <p className="text-sm text-slate-400">Opening your workspace…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Auth
        health={health}
        error={error}
        onRetry={boot}
        onSuccess={async () => {
          await boot();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-canvas px-5 py-4 lg:hidden">
        <a href="#dashboard" className="flex items-center gap-2 text-xl font-bold">
          <Leaf size={24} className="text-brand" />
          folio<span className="text-brand">.</span>
        </a>
        <button
          onClick={() => setMobile(!mobile)}
          aria-label={mobile ? 'Close navigation' : 'Open navigation'}
          className="rounded-lg p-2"
        >
          {mobile ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      {mobile && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobile(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[#173c36] px-4 py-7 text-white transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <a
          href="#dashboard"
          onClick={() => navigate('dashboard')}
          className="mb-10 flex items-center gap-2.5 px-4 text-3xl font-semibold tracking-tight"
        >
          <span className="rounded-xl bg-white/10 p-2">
            <Leaf size={23} strokeWidth={1.6} />
          </span>
          folio<span className="-ml-2 text-[#c7deb1]">.</span>
        </a>
        <p className="mb-3 px-4 text-[10px] font-semibold uppercase tracking-[.2em] text-white/35">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {nav.map(([key, label, Icon]) => (
            <a
              href={`#${key}`}
              key={key}
              onClick={(e) => {
                e.preventDefault();
                navigate(key);
              }}
              aria-current={page === key ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-[13px] transition ${page === key ? 'bg-white/12 font-semibold text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon size={17} strokeWidth={1.7} />
              {label}
              {key === 'applications' && applications.length > 0 && (
                <span className="ml-auto rounded bg-white/10 px-1.5 text-[10px]">{applications.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[#c7deb1]">
              <ShieldCheck size={15} />
              <p className="text-xs font-semibold">Your search. Your space.</p>
            </div>
            <p className="text-[11px] leading-5 text-white/40">
              Self hosted. Thoughtfully organized. Built around your next chapter.
            </p>
          </div>
          <a
            href="#settings"
            onClick={(e) => {
              e.preventDefault();
              navigate('settings');
            }}
            className={`mb-2 flex items-center gap-3 rounded-lg px-4 py-3 text-[13px] ${page === 'settings' ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/5'}`}
          >
            <SettingsIcon size={17} />
            Settings
          </a>
          <div className="flex items-center gap-3 border-t border-white/10 px-3 pt-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d9e6cd] text-sm font-semibold text-[#173c36]">
              {user.name?.slice(0, 1).toUpperCase() || 'Y'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.name || 'Your workspace'}</p>
              <p className="mt-1 text-[10px] text-white/35">Personal workspace</p>
            </div>
            <button
              aria-label="Sign out"
              onClick={logout}
              className="rounded p-2 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-60">
        <div className="hidden items-center justify-between border-b border-slate-200/70 px-8 py-4 text-xs text-slate-400 lg:flex">
          <span>
            Workspace <span className="mx-2 text-slate-300">/</span>
            <span className="font-medium text-slate-600">{nav.find((n) => n[0] === page)?.[1] || 'Settings'}</span>
          </span>
          <span>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 xl:px-9">
          <ErrorNote>{error}</ErrorNote>
          <Suspense
            fallback={
              <p role="status" className="py-12 text-sm text-slate-400">
                Opening workspace…
              </p>
            }
          >
            {page === 'dashboard' && (
              <Dashboard applications={applications} user={user} draft={draft} navigate={navigate} />
            )}{' '}
            {page === 'profile' && <Profile profile={profile} setProfile={setProfile} refresh={load} />}{' '}
            {page === 'preparation' && (
              <Preparation
                profile={profile}
                documents={documents}
                applications={applications}
                draft={draft}
                onDraftChange={setDraft}
                refresh={load}
                navigate={navigate}
              />
            )}{' '}
            {page === 'applications' && (
              <Applications
                key={filter}
                applications={applications}
                documents={documents}
                refresh={load}
                initialStatus={filter}
              />
            )}{' '}
            {['resumes', 'letters'].includes(page) && (
              <Documents
                key={page}
                documents={documents}
                applications={applications}
                type={page === 'resumes' ? 'resume' : 'cover-letter'}
                refresh={load}
              />
            )}{' '}
            {page === 'settings' && <Settings settings={settings} refresh={load} />}
          </Suspense>
        </div>
        <footer className="mx-7 mb-6 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          <span>Folio · A little structure for your next chapter.</span>
          <span>Personal workspace · Self hosted</span>
        </footer>
      </main>
    </div>
  );
}

function Auth({ health, error, onRetry, onSuccess }) {
  const [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState('');
  const setup = health?.setupRequired;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setLocalError('');
    try {
      await api(setup ? '/auth/setup' : '/auth/login', {
        method: 'POST',
        body: setup ? { name, password } : { password }
      });
      await onSuccess();
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#173c36] p-14 text-white lg:flex">
        <div className="flex items-center gap-3 text-3xl font-semibold">
          <Leaf size={32} />
          folio.
        </div>
        <div>
          <p className="mb-6 text-xs font-semibold uppercase tracking-[.2em] text-[#c7deb1]">
            Make room for what's next
          </p>
          <h1 className="max-w-lg text-5xl font-medium leading-tight tracking-tight">
            Your next chapter,
            <br />
            <span className="text-[#c7deb1]">a little closer.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-8 text-white/50">
            Bring your experience, applications, and next steps into one calm workspace.
          </p>
          <div className="mt-10 flex gap-6 text-xs text-white/50">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} />
              Self hosted
            </span>
            <span className="flex items-center gap-2">
              <Sparkles size={16} />
              AI when you need it
            </span>
          </div>
        </div>
        <p className="text-xs text-white/30">Your career deserves more than a spreadsheet.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-2xl font-semibold lg:hidden">
            <Leaf className="text-brand" />
            folio.
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.17em] text-brand">Personal workspace</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {setup ? 'Make yourself at home.' : 'Welcome back.'}
          </h2>
          <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">
            {setup
              ? 'Create your private workspace. One account, all your opportunities.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <ErrorNote>{localError || error}</ErrorNote>
          {!health || health.database === false ? (
            <div>
              <p className="mb-4 text-sm text-slate-500">
                The server or database is not ready. Check your configuration, then try again.
              </p>
              <Button onClick={onRetry} variant="secondary">
                <RefreshCw size={15} />
                Try again
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {setup && (
                <Field label="Your name">
                  <Input
                    autoFocus
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </Field>
              )}
              <Field label="Workspace password">
                <Input
                  autoFocus={!setup}
                  type="password"
                  required
                  minLength={setup ? 10 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={setup ? 'new-password' : 'current-password'}
                />
              </Field>
              {setup && (
                <p className="text-xs text-slate-400">Use at least 10 characters. Keep this password somewhere safe.</p>
              )}
              <Button className="w-full" type="submit" loading={busy} disabled={setup && !name.trim()}>
                {setup ? 'Create workspace' : 'Open workspace'}
                <ArrowRight size={16} />
              </Button>
            </form>
          )}
          <p className="mt-8 text-center text-xs text-slate-400">Stored on your server. Ready for your next move.</p>
        </div>
      </div>
    </div>
  );
}
