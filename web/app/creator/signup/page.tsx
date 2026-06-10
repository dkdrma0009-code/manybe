'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/creator/dashboard`,
        scopes: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'creator', display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/creator/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
          <span className="text-3xl">✉️</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">이메일을 확인해주세요</h2>
        <p className="text-slate-400 text-sm">{email}로 인증 링크를 보냈습니다.</p>
        <Link href="/creator/login" className="inline-block mt-6 text-sm text-indigo-400 hover:text-indigo-300">
          로그인 페이지로 →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8">
      <h1 className="text-xl font-bold text-white mb-6">크리에이터 가입</h1>

      <button
        onClick={handleGoogleSignup}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-colors mb-6"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google로 시작하기 (YouTube 자동 연동)
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500">또는 이메일로</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">채널명 / 닉네임</label>
          <input
            type="text"
            required
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="채널명 또는 닉네임"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">이메일</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="hello@example.com"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">비밀번호</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="8자 이상"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
        >
          {loading ? '가입 중...' : '시작하기'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        이미 계정이 있으신가요?{' '}
        <Link href="/creator/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
          로그인
        </Link>
      </p>
    </div>
  );
}

export default function CreatorSignupPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-xl"
              style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
              M
            </div>
            <span className="font-bold text-xl text-white">Manybe</span>
          </Link>
          <p className="text-slate-400 text-sm mt-2">크리에이터 비즈니스 매니저</p>
        </div>
        <Suspense fallback={
          <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 flex items-center justify-center min-h-[420px]">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
