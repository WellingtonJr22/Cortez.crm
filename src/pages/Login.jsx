import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);
  const googleClientId = /** @type {any} */ (import.meta).env?.VITE_GOOGLE_CLIENT_ID || null;

  useEffect(() => {
    // If a real Google client id is configured, try to load the Google Identity
    // Services library and render the button.
    if (!googleClientId) return;
    const existing = document.getElementById('google-identity');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'google-identity';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
      s.onload = () => renderGoogle();
    } else {
      renderGoogle();
    }

    function renderGoogle() {
      const googleWindow = /** @type {any} */ (window);
      if (!googleWindow.google || !googleBtnRef.current) return;
      try {
        googleWindow.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (res) => {
            // res.credential is the ID token (JWT)
            auth.loginWithGoogle(res.credential).then(() => navigate('/')).catch(e => setError(e.message));
          }
        });
        googleWindow.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'outline', size: 'large' });
      } catch (e) {
        console.warn('Google button render failed', e);
      }
    }
  }, [googleClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await auth.login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Senha</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="senha" />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <div className="flex items-center justify-between">
            <Button type="submit">Entrar</Button>
          </div>
        </form>
        <div className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">Ou entre com:</div>
          <div className="flex gap-2">
            {googleClientId ? (
              <div ref={googleBtnRef} />
            ) : (
              <Button onClick={async () => { try { await auth.loginWithGoogle(); navigate('/'); } catch (e) { setError(e.message); } }}>
                <LogIn className="w-4 h-4 mr-2" /> Entrar com Google
              </Button>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-4">Você também pode usar login via Gmail futuramente (OAuth).</div>
      </div>
    </div>
  );
}
