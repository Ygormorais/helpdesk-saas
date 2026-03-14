import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdAccounts = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: Record<string, string | number | boolean>
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdAccounts;
      };
    };
  }
}

interface GoogleLoginButtonProps {
  onCredential: (credential: string) => Promise<void> | void;
  disabled?: boolean;
}

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export function GoogleLoginButton({ onCredential, disabled = false }: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    const handleLoad = () => setScriptReady(true);
    const handleError = () => setScriptError(true);

    if (existing) {
      existing.addEventListener('load', handleLoad);
      existing.addEventListener('error', handleError);
      return () => {
        existing.removeEventListener('load', handleLoad);
        existing.removeEventListener('error', handleError);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (!googleClientId || !scriptReady || !containerRef.current || !window.google?.accounts?.id) {
      return;
    }

    containerRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (response.credential) {
          void callbackRef.current(response.credential);
        }
      },
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 360,
      logo_alignment: 'left',
    });
  }, [scriptReady]);

  if (!googleClientId) {
    return null;
  }

  if (scriptError) {
    return (
      <Button type="button" variant="outline" className="w-full" disabled>
        Google indisponivel
      </Button>
    );
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-70' : ''}>
      <div ref={containerRef} className="flex min-h-10 w-full justify-center" />
    </div>
  );
}
