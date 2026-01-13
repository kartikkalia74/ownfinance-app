import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-[#F8F9FC] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link to="/login">
                        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Button>
                    </Link>
                </div>

                <div className="bg-white shadow-sm rounded-lg p-8 space-y-6">
                    <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">Privacy Policy</h1>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">1. Data Privacy & Security</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Your financial data is yours alone. We do not store, access, or share your personal financial information on our servers.
                            All data is stored locally on your device or securely in your own Google Drive account.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">2. Google Drive Integration</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Our application integrates with Google Drive to provide data synchronization and backup capabilities.
                            We only access files created by this application (`finance.sqlite`) and do not read or modify any other files in your Google Drive.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">3. Local Processing</h2>
                        <p className="text-gray-600 leading-relaxed">
                            All calculations, analytics, and data processing happen locally in your browser.
                            Sensitive bank statement data is parsed on your device and never transmitted to external servers.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">4. Third-Party Services</h2>
                        <p className="text-gray-600 leading-relaxed">
                            We use Google OAuth for authentication solely to facilitate the secure connection to your Google Drive.
                            No other third-party tacking or analytics services are used.
                        </p>
                    </section>

                    <div className="pt-6 border-t text-sm text-gray-500">
                        Last updated: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
