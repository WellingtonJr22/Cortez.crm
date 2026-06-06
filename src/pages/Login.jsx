import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const isSignup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await auth.signup(email.trim(), password, fullName.trim());
      } else {
        await auth.login(email.trim(), password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-1">Cortez CRM</h2>
        <p className="text-sm text-muted-foreground mb-5">
          {isSignup ? 'Crie sua conta para começar.' : 'Entre na sua conta.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="text-sm text-muted-foreground">Nome completo</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'Mínimo 6 caracteres' : 'Sua senha'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <div className="text-destructive text-sm">{error}</div>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {isSignup ? (
              <><UserPlus className="w-4 h-4 mr-2" /> Criar conta</>
            ) : (
              <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
            )}
          </Button>
        </form>

        <div className="text-sm text-muted-foreground mt-5 text-center">
          {isSignup ? (
            <>
              Já tem uma conta?{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => { setMode('login'); setError(null); }}
              >
                Entrar
              </button>
            </>
          ) : (
            <>
              Não tem conta?{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Cadastre-se
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
