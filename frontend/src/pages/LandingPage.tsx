
import { Link } from 'react-router-dom'

export const LandingPage = () => {
    return (
        <div className="bg-white min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full py-6 px-8 flex justify-between items-center max-w-7xl mx-auto">
                <div className="text-2xl font-bold text-blue-600">VPROD</div>
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
            <main className="flex-grow flex items-center">
                <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left Content */}
                    <div className="space-y-8">
                        <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
                            Real-time insights for your <span className="text-blue-600">voice AI</span>.
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                            Monitor active calls, read live transcripts, and analyze performance instantly. The comprehensive dashboard for your voice agents.
                        </p>
                        <div className="flex gap-4">
                            <Link
                                to="/login"
                                className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-blue-700 transition shadow-lg flex items-center gap-2"
                            >
                                Access Dashboard
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        </div>
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
            </main>

            {/* Simple Footer */}
            <footer className="bg-gray-50 py-8 text-center text-gray-500 text-sm">
                © {new Date().getFullYear()} VPROD Dashboard. All rights reserved.
            </footer>
        </div>
    )
}
