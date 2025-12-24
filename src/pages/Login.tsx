import { useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Login() {
    const setAuth = useAuthStore((state) => state.setAuth);
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();

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

                // Fetch Profile
                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                    .then(res => res.json())
                    .then(profile => {
                        console.log('Login: Profile fetched', profile);
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
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                    <span className="text-white text-2xl font-bold">OF</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-500 mb-8">Sign in to sync your finance data securely with your Google Drive.</p>

                <Button
                    onClick={() => handleLogin()}
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-6 text-lg font-medium shadow-sm flex items-center justify-center gap-3"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                    Sign in with Google
                </Button>

                <div className="mt-8 text-xs text-gray-400">
                    <p>By continuing, you grant access to create and manage the 'finance.sqlite' file in your Google Drive.</p>
                </div>
            </div>
        </div>
    );
}
