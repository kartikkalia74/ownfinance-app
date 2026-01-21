import { useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/auth';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { MoveRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkEmailExists, logLogin } from '@/services/emailService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Login() {
    const setAuth = useAuthStore((state) => state.setAuth);
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        const hasToken = useAuthStore.getState().token;
        console.log('Login: Check Token', { token, hasToken });
        if (token) {
            console.log('Login: Token present, redirecting to /');
            navigate('/', { replace: true });
        }
    }, [token, navigate]);

    // Handle OAuth Callback (Token in URL Hash)
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1)); // Remove leading '#'
            const accessToken = params.get('access_token');

            if (accessToken) {
                console.log('Login: Detected access token in URL');

                setIsLoading(true);
                // Fetch Profile
                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                    .then(res => res.json())
                    .then(async (profile) => {
                        console.log('Login: Profile fetched', profile);

                        // Check if email is registered
                        const isRegistered = await checkEmailExists(profile.email);

                        if (!isRegistered) {
                            setError('This email is not registered for beta access. Please contact support if you think this is an error.');
                            setIsLoading(false);
                            // Clear Hash
                            window.history.replaceState(null, '', window.location.pathname);
                            return;
                        }

                        // Log login detail
                        await logLogin(profile.email);

                        setAuth(accessToken, {
                            name: profile.name,
                            email: profile.email,
                            picture: profile.picture
                        });

                        // Clear Hash
                        window.history.replaceState(null, '', window.location.pathname);
                        navigate('/', { replace: true });
                    })
                    .catch(err => {
                        console.error('Login: Failed to fetch profile', err);
                        setError('Failed to authenticate with Google. Please try again.');
                        setIsLoading(false);
                    });
            }
        }
    }, [setAuth, navigate]);

    // Manual Redirect Flow to bypass COOP/COEP popup issues
    const handleLogin = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const redirectUri = window.location.origin + '/login';
        const scope = 'https://www.googleapis.com/auth/drive.file email profile openid';
        const responseType = 'token';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&include_granted_scopes=true`;

        console.log('Login: Redirecting to', authUrl);
        window.location.href = authUrl;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full text-center">
                <img src="/logos/logo.gif" alt="OwnFinance" className="w-20 h-20 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-500 mb-6">Sign in to sync your finance data securely with your Google Drive.</p>

                {error && (
                    <Alert variant="destructive" className="mb-6 text-left">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Access Denied</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        <a href="https://ownfinance.site"> <span className="text-xs text-blue-500">know more</span></a>
                    </Alert>
                )}

                <Button
                    onClick={() => handleLogin()}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-6 text-lg font-medium shadow-sm flex items-center justify-center gap-3"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                            Verifying...
                        </div>
                    ) : (
                        <>
                            <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26+-.19-.58z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /><path d="M1 1h22v22H1z" fill="none" /></svg>
                            Sign in with Google
                        </>
                    )}
                </Button>

                <div className="mt-8 text-xs text-gray-400">
                    <p>By continuing, you grant access to create and manage the 'finance.sqlite' file in your Google Drive.</p>
                    <div className="mt-4 flex justify-center gap-4 text-[10px] uppercase tracking-wider">
                        <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
                        <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
