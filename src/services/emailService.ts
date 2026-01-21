const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

export const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!SCRIPT_URL) return false;

    try {
        const response = await fetch(`${SCRIPT_URL}?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            mode: 'cors',
        });
        const data = await response.json();
        return data.exists === true;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
};

export const registerEmail = async (email: string): Promise<{ status: string; message?: string }> => {
    if (!SCRIPT_URL) return { status: 'error', message: 'URL not configured' };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, login: true }),
        });

        // With no-cors, we can't reliably read the JSON response.
        // If it doesn't throw, we assume it's sent.
        return { status: 'success' };
    } catch (error) {
        console.error('Error registering email:', error);
        return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
    }
};

export const logLogin = async (email: string): Promise<void> => {
    if (!SCRIPT_URL) return;

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                action: 'login',
                timestamp: new Date().toISOString()
            }),
        });
    } catch (error) {
        console.error('Error logging login:', error);
    }
};
