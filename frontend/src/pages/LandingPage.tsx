
import { Link } from 'react-router-dom'

export const LandingPage = () => {
    return (
        <div className="bg-white min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full py-6 px-8 flex justify-between items-center max-w-7xl mx-auto">
                <div className="text-2xl font-bold text-blue-600">VoxFlow</div>
                <nav>
                    <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium px-4">
                        Sign In
                    </Link>
                    <Link
                        to="/login"
                        className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 transition"
                    >
                        Get Started
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left Content */}

                    <div className="space-y-8">
                        <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
                            Built for <span className="text-blue-600">Insurance</span> <br className="hidden lg:block" /> Trained to <span className="text-indigo-600">Close</span>
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                            Compliance-first AI voice agents designed for Life and Health Insurance - qualifying leads, asking the right questions, and handing off to licensed agents with confidence.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/login"
                                className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                See It in Action
                            </Link>
                            <Link
                                to="#"
                                className="bg-gray-100 text-gray-700 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-200 transition shadow-sm flex items-center justify-center gap-2"
                            >
                                How It Works
                            </Link>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Built with TCPA-aware flows and audit-ready call handling.
                        </p>
                    </div>

                    {/* Right Visual (Placeholder) */}
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-30"></div>
                        <div className="relative bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
                            {/* Fake UI Container */}
                            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="p-8 space-y-4">
                                <div className="flex justify-between items-center text-gray-400 text-sm">
                                    <span>Active Calls (3)</span>
                                    <span className="text-green-400">● Live</span>
                                </div>
                                {/* Mock Call Item */}
                                <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center border border-gray-700">
                                    <div>
                                        <div className="text-white font-medium">+1 (555) 123-4567</div>
                                        <div className="text-gray-500 text-sm">Duration: 02:14</div>
                                    </div>
                                    <div className="text-blue-400 text-sm bg-blue-400/10 px-3 py-1 rounded-full">In Progress</div>
                                </div>
                                {/* Mock Call Item 2 */}
                                <div className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center border border-gray-700">
                                    <div>
                                        <div className="text-white font-medium">+1 (555) 987-6543</div>
                                        <div className="text-gray-500 text-sm">Duration: 00:45</div>
                                    </div>
                                    <div className="text-blue-400 text-sm bg-blue-400/10 px-3 py-1 rounded-full">In Progress</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Feature Strip */}
                <div className="bg-white border-t border-gray-100 py-12">
                    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="flex flex-col items-start space-y-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Compliance by Design</h3>
                            <p className="text-gray-600">Health questions, disclosures, interruptions, and transfers handled correctly — every time.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex flex-col items-start space-y-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Human-Sounding Conversations</h3>
                            <p className="text-gray-600">Natural, empathetic voice agents trained to earn trust, not rush calls.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex flex-col items-start space-y-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Faster, Cleaner Handoffs</h3>
                            <p className="text-gray-600">Qualified leads and context-rich transfers so licensed agents focus on closing.</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="bg-gray-50 py-8 text-center text-gray-500 text-sm">
                © {new Date().getFullYear()} VoxFlow Dashboard. All rights reserved.
            </footer>
        </div>
    )
}
