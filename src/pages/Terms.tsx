import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
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
                    <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">Terms and Conditions</h1>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">1. Acceptance of Terms</h2>
                        <p className="text-gray-600 leading-relaxed">
                            By accessing and using this application, you accept and agree to be bound by the terms and provision of this agreement.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">2. Use License</h2>
                        <p className="text-gray-600 leading-relaxed">
                            This is a personal finance management tool. You are granted permission to use this software for personal, non-commercial transitory viewing and usage.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">3. Disclaimer</h2>
                        <p className="text-gray-600 leading-relaxed">
                            The materials on this application are provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties, including without limitation, implied warranties or conditions of merchantability, or fitness for a particular purpose.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-800">4. Limitations</h2>
                        <p className="text-gray-600 leading-relaxed">
                            In no event shall we be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this application.
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
