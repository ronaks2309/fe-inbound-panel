import { useState } from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
    {
        tab: 'Live Monitor',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
            </svg>
        ),
        title: 'Real-time call supervision — without the chaos.',
        desc: 'Every active AI call, visible in one place. Supervisors see live transcripts, caller sentiment, and call duration as they happen — so they always know where to focus.',
        bullets: [
            'Live sentiment scoring: Positive, Neutral, or Negative updated in real time',
            'One-click "Take Over" to transfer the AI call directly to a human agent',
            'Whisper guidance to the AI mid-call without the customer hearing',
        ],
        image: '/active-calls-monitor.png',
        imageAlt: 'Live Call Monitor Dashboard',
    },
    {
        tab: 'Call Logs',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
        ),
        title: 'Every call, logged. Every detail, searchable.',
        desc: 'A complete audit trail of all calls — live, transferred, resolved, or flagged for follow-up. Filter, tag, and review with the depth compliance teams actually need.',
        bullets: [
            'Filter by status: Live, Transferred, Follow-up, Resolved',
            'Sentiment score, disposition tags, and duration at a glance',
            'Instant access to transcripts and recordings per call',
        ],
        image: '/demo-call-log.png',
        imageAlt: 'Call Logs Dashboard',
    },
    {
        tab: 'Whisper Notes',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
        ),
        title: 'Coach the AI without interrupting the call.',
        desc: 'Supervisors send real-time guidance directly to the AI agent while the conversation is live — using preset scripts or custom messages the customer never hears.',
        bullets: [
            'Pre-loaded whisper scripts for common insurance scenarios',
            'Custom message field for in-the-moment coaching',
            'Delivered instantly, completely invisible to the caller',
        ],
        image: '/whisper-prompts.png',
        imageAlt: 'Whisper Notes Panel',
    },
    {
        tab: 'Feedback Loop',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        ),
        title: 'Human judgment that makes the AI smarter over time.',
        desc: 'After every call, supervisors rate performance and leave notes. That feedback feeds directly into agent improvement — a loop where every call makes the next one better.',
        bullets: [
            '1–5 star rating per call with free-text comments',
            'Saved to the call log for training and QA review',
            'Continuous improvement without manual retraining cycles',
        ],
        image: '/feebdack-demo.png',
        imageAlt: 'Call Feedback Panel',
    },
]

export const LandingPage = () => {
    const [activeFeature, setActiveFeature] = useState(0)
    const [showPreview, setShowPreview] = useState(false)

    const current = FEATURES[activeFeature]

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .lp { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; color: #0f172a; min-height: 100vh; }
                .display { font-family: 'Bricolage Grotesque', sans-serif; }

                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-14px); }
                }
                @keyframes pulse-dot {
                    0%   { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2.6); opacity: 0; }
                }
                @keyframes slide-in {
                    from { opacity: 0; transform: translateX(16px); }
                    to   { opacity: 1; transform: translateX(0); }
                }

                .fu-1 { animation: fade-up 0.7s cubic-bezier(.22,1,.36,1) 0.05s both; }
                .fu-2 { animation: fade-up 0.7s cubic-bezier(.22,1,.36,1) 0.2s  both; }
                .fu-3 { animation: fade-up 0.7s cubic-bezier(.22,1,.36,1) 0.35s both; }
                .fu-4 { animation: fade-up 0.7s cubic-bezier(.22,1,.36,1) 0.5s  both; }
                .fu-5 { animation: fade-up 0.7s cubic-bezier(.22,1,.36,1) 0.65s both; }
                .float-card { animation: float 6s ease-in-out infinite; }
                .img-slide  { animation: slide-in 0.3s cubic-bezier(.22,1,.36,1) both; }

                /* Live dot */
                .live-dot {
                    position: relative; display: inline-block;
                    width: 8px; height: 8px; border-radius: 50%; background: #16a34a; flex-shrink: 0;
                }
                .live-dot::before {
                    content: ''; position: absolute; inset: 0; border-radius: 50%;
                    background: #16a34a; animation: pulse-dot 1.8s ease-out infinite;
                }

                /* Nav */
                .lp-nav {
                    position: sticky; top: 0; z-index: 50;
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid #e2e8f0;
                }

                /* Hero */
                .lp-hero { background: #0f172a; position: relative; overflow: hidden; }
                .hero-grid {
                    position: absolute; inset: 0;
                    background-image: linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px);
                    background-size: 60px 60px;
                }
                .hero-orb-a { position: absolute; top: -15%; right: -8%;  width: 640px; height: 640px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%); pointer-events: none; }
                .hero-orb-b { position: absolute; bottom: -25%; left: -8%; width: 480px; height: 480px; border-radius: 50%; background: radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 65%); pointer-events: none; }

                /* Buttons */
                .btn-primary {
                    background: #2563EB; color: #fff;
                    font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 15px;
                    border: none; cursor: pointer;
                    transition: all 0.18s ease;
                    box-shadow: 0 4px 14px rgba(37,99,235,0.35);
                    text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
                }
                .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 22px rgba(37,99,235,0.45); }

                .btn-ghost-white {
                    background: transparent; color: rgba(255,255,255,0.82);
                    font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; font-size: 15px;
                    border: 1px solid rgba(255,255,255,0.2); cursor: pointer;
                    transition: all 0.18s ease; text-decoration: none;
                    display: inline-flex; align-items: center; gap: 8px;
                }
                .btn-ghost-white:hover { border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.06); }

                .btn-ghost-blue {
                    background: transparent; color: #2563eb;
                    font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 15px;
                    border: 1.5px solid #2563eb; cursor: pointer;
                    transition: all 0.18s ease; text-decoration: none;
                    display: inline-flex; align-items: center; gap: 8px;
                }
                .btn-ghost-blue:hover { background: #eff6ff; }

                .btn-white {
                    background: #fff; color: #2563eb;
                    font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 15px;
                    border: none; cursor: pointer;
                    transition: all 0.18s ease;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.18);
                    text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
                }
                .btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.22); }

                /* Feature tabs */
                .feat-tab {
                    width: 100%; text-align: left; background: transparent; border: none;
                    cursor: pointer; padding: 14px 18px; border-radius: 10px;
                    display: flex; align-items: center; gap: 12px;
                    transition: all 0.18s ease; color: #64748b;
                    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 500;
                    border-left: 3px solid transparent;
                }
                .feat-tab:hover { background: #f1f5f9; color: #0f172a; }
                .feat-tab.active { background: #eff6ff; color: #2563eb; border-left-color: #2563eb; font-weight: 600; }

                .tab-icon {
                    width: 34px; height: 34px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    background: #f1f5f9; flex-shrink: 0; transition: background 0.18s;
                }
                .feat-tab.active .tab-icon { background: #dbeafe; color: #2563eb; }

                /* Screenshot */
                .ss-frame {
                    background: #f8fafc; border-radius: 16px;
                    border: 1px solid #e2e8f0; overflow: hidden;
                    box-shadow: 0 20px 60px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.05);
                }
                .ss-chrome {
                    background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
                    padding: 10px 16px; display: flex; align-items: center; gap: 6px;
                }
                .ss-dot { width: 10px; height: 10px; border-radius: 50%; }

                /* Mini feature cards */
                .mini-card {
                    background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
                    padding: 26px; transition: all 0.2s ease;
                }
                .mini-card:hover {
                    border-color: #93c5fd; transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(37,99,235,0.08);
                }

                /* Demo cards */
                .demo-card {
                    border: 1px solid rgba(255,255,255,0.09);
                    background: rgba(255,255,255,0.04);
                    border-radius: 16px; padding: 28px 24px;
                    text-decoration: none; color: inherit; display: block;
                    transition: all 0.2s ease;
                }
                .demo-card:hover {
                    border-color: rgba(59,130,246,0.4);
                    background: rgba(37,99,235,0.08);
                    transform: translateY(-3px);
                    box-shadow: 0 12px 32px rgba(37,99,235,0.12);
                }

                /* CTA */
                .lp-cta {
                    background: linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%);
                    position: relative; overflow: hidden;
                }
                .cta-tex {
                    position: absolute; inset: 0;
                    background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
                    background-size: 48px 48px;
                }

                /* Bullet */
                .bullet { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #475569; line-height: 1.65; }
                .check { width: 18px; height: 18px; border-radius: 50%; background: #dbeafe; color: #2563eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }

                a { text-decoration: none; }
            `}</style>

            <div className="lp">

                {/* NAV */}
                <header className="lp-nav">
                    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="display" style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', letterSpacing: '-0.02em' }}>CallMark AI</span>
                        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Link to="/login" style={{ color: '#64748b', fontSize: 14, fontWeight: 500, padding: '8px 14px', borderRadius: 8, transition: 'color 0.15s', textDecoration: 'none' }}
                                onMouseEnter={e => ((e.target as HTMLElement).style.color = '#0f172a')}
                                onMouseLeave={e => ((e.target as HTMLElement).style.color = '#64748b')}>
                                Sign In
                            </Link>
                            <Link to="/login" className="btn-primary" style={{ padding: '9px 20px', borderRadius: 100, fontSize: 14 }}>
                                Get Started
                            </Link>
                        </nav>
                    </div>
                </header>

                {/* HERO */}
                <section className="lp-hero" style={{ padding: '88px 24px 108px' }}>
                    <div className="hero-grid" />
                    <div className="hero-orb-a" />
                    <div className="hero-orb-b" />
                    <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
                        {/* Copy */}
                        <div>
                            <div className="fu-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.14)', border: '1px solid rgba(37,99,235,0.28)', borderRadius: 100, padding: '5px 14px', marginBottom: 28 }}>
                                <span className="live-dot" />
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Voice Agents · Insurance-Grade</span>
                            </div>
                            <h1 className="display fu-2" style={{ fontSize: 'clamp(38px, 5vw, 66px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: 24 }}>
                                Built for<br />
                                <span style={{ color: '#60a5fa' }}>Insurance.</span><br />
                                Trained to Close.
                            </h1>
                            <p className="fu-3" style={{ fontSize: 17, lineHeight: 1.75, color: 'rgba(248,250,252,0.58)', maxWidth: 460, marginBottom: 36 }}>
                                Compliance-first AI voice agents for Life and Health Insurance — qualifying leads, asking the right questions, and handing off with full context and confidence.
                            </p>
                            <div className="fu-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
                                <button onClick={() => setShowPreview(true)} className="btn-primary" style={{ padding: '13px 26px', borderRadius: 100 }}>
                                    See It in Action
                                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                    </svg>
                                </button>
                                <Link to="/dashboard" className="btn-ghost-white" style={{ padding: '13px 26px', borderRadius: 100 }}>
                                    Access Dashboard
                                </Link>
                            </div>
                            <p className="fu-5" style={{ fontSize: 11, color: 'rgba(248,250,252,0.28)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>
                                TCPA-aware · Audit-ready · Human supervision built in
                            </p>
                        </div>

                        {/* Hero card */}
                        <div className="float-card" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
                                <div style={{ background: '#0f172a', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 22, marginLeft: 8, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>callmark.ai/dashboard</span>
                                    </div>
                                </div>
                                <div style={{ padding: 18 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>Active Sessions</div>
                                            <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.38)' }}>Real-time AI monitoring</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(37,99,235,0.14)', border: '1px solid rgba(37,99,235,0.28)', borderRadius: 100, padding: '4px 10px' }}>
                                            <span className="live-dot" style={{ width: 6, height: 6 }} />
                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa' }}>3 Live</span>
                                        </div>
                                    </div>
                                    {[
                                        { i: 'SJ', name: 'Sarah Jenkins', num: '+1 (555) 012-3456', t: '04:23', s: 'Positive 85%', sc: '#16a34a', sb: 'rgba(22,163,74,0.12)', hi: false },
                                        { i: 'MD', name: 'Mark Doe',      num: '+1 (555) 098-7654', t: '01:12', s: 'Neutral 55%',   sc: '#d97706', sb: 'rgba(217,119,6,0.12)',  hi: false },
                                        { i: 'EC', name: 'Emily Chen',    num: '+1 (555) 456-7890', t: '08:45', s: 'Negative 20%',  sc: '#dc2626', sb: 'rgba(220,38,38,0.12)',  hi: true  },
                                    ].map((c, idx) => (
                                        <div key={idx} style={{ background: c.hi ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${c.hi ? 'rgba(220,38,38,0.28)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{c.i}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>{c.name}</div>
                                                <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.38)' }}>{c.num}</div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{c.t}</div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: c.sc, background: c.sb, padding: '2px 8px', borderRadius: 100 }}>{c.s}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* STATS */}
                <section style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {[
                            { num: '70%',  label: 'Cost reduction vs. traditional call centers' },
                            { num: '100%', label: 'TCPA-compliant call flows, every time' },
                            { num: '<2s',  label: 'AI voice response latency' },
                            { num: '24/7', label: 'Always-on inbound call coverage' },
                        ].map((s, i) => (
                            <div key={i} style={{ padding: '36px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid #e2e8f0' : 'none' }}>
                                <div className="display" style={{ fontSize: 40, fontWeight: 800, color: '#2563eb', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>{s.num}</div>
                                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* STORY */}
                <section style={{ padding: '96px 24px', background: '#fff' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 72, alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6, marginBottom: 20 }}>Our Story</div>
                            <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: 22 }}>
                                Insurance calls aren't like other calls.
                            </h2>
                            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, marginBottom: 18 }}>
                                A Medicare agency came to us with a hard truth: every AI solution they'd tried had the same breaking point. Two out of ten calls would go sideways — confused customers, compliance gaps, damaged trust.
                            </p>
                            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, marginBottom: 32 }}>
                                The answer wasn't better AI in isolation. It was AI and humans working in concert — supervisors always one click away when it matters most.
                            </p>
                            <div style={{ display: 'flex', gap: 40 }}>
                                {[{ n: 'AI Efficiency', d: 'Handles volume at scale' }, { n: 'Human Empathy', d: 'Steps in when stakes are high' }].map((x, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>{x.n}</div>
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>{x.d}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: '#0f172a', borderRadius: 20, padding: 40, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)' }} />
                            <div className="display" style={{ fontSize: 72, lineHeight: 0.7, color: '#2563eb', opacity: 0.35, marginBottom: 20, position: 'relative' }}>"</div>
                            <p className="display" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 600, lineHeight: 1.5, color: '#f8fafc', marginBottom: 28, position: 'relative' }}>
                                We didn't want to replace our agents. We wanted to give them a superpower.
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>M</div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>Medicare Agency Director</div>
                                    <div style={{ fontSize: 12, color: '#475569' }}>CallMark AI Customer</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURE WALKTHROUGH */}
                <section style={{ padding: '96px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div style={{ marginBottom: 52, maxWidth: 540 }}>
                            <div style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6, marginBottom: 20 }}>Platform Walkthrough</div>
                            <h2 className="display" style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: 14 }}>
                                See every tool your team will use.
                            </h2>
                            <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7 }}>
                                From live supervision to post-call training — a complete system built specifically for insurance call centers.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 28, alignItems: 'start' }}>
                            {/* Tab sidebar */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 80 }}>
                                {FEATURES.map((f, i) => (
                                    <button key={i} className={`feat-tab${activeFeature === i ? ' active' : ''}`} onClick={() => setActiveFeature(i)}>
                                        <span className="tab-icon">{f.icon}</span>
                                        {f.tab}
                                    </button>
                                ))}
                                <div style={{ marginTop: 20, padding: '16px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 5 }}>Built for Compliance</div>
                                    <div style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.6 }}>Every feature is designed with TCPA-aware flows and audit-ready logging in mind.</div>
                                </div>
                            </div>

                            {/* Content pane */}
                            <div>
                                {/* Description */}
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, marginBottom: 18 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <div style={{ width: 42, height: 42, borderRadius: 11, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                            {current.icon}
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563eb' }}>{current.tab}</span>
                                    </div>
                                    <h3 className="display" style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 12 }}>
                                        {current.title}
                                    </h3>
                                    <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.75, marginBottom: 22 }}>{current.desc}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {current.bullets.map((b, i) => (
                                            <div key={i} className="bullet">
                                                <span className="check">
                                                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 10, height: 10 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                </span>
                                                {b}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Screenshot */}
                                <div className="ss-frame">
                                    <div className="ss-chrome">
                                        <div className="ss-dot" style={{ background: '#ef4444' }} />
                                        <div className="ss-dot" style={{ background: '#f59e0b' }} />
                                        <div className="ss-dot" style={{ background: '#22c55e' }} />
                                        <div style={{ flex: 1, background: 'rgba(15,23,42,0.05)', borderRadius: 6, height: 22, marginLeft: 10, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>callmark.ai/dashboard</span>
                                        </div>
                                    </div>
                                    <img key={activeFeature} className="img-slide" src={current.image} alt={current.imageAlt} style={{ width: '100%', display: 'block' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* MINI FEATURES */}
                <section style={{ padding: '80px 24px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 48 }}>
                            <h2 className="display" style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 12 }}>
                                Everything compliance demands. Nothing extra.
                            </h2>
                            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
                                Built from the ground up for Life and Health Insurance — not repurposed from a generic call center platform.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                            {[
                                { e: '🛡️', t: 'Compliance by Design',      d: 'TCPA-aware flows, required disclosures, and compliant call handling baked in from day one.' },
                                { e: '👁️', t: 'Live Human Supervision',     d: 'Supervisors monitor every call and take over instantly — one click, zero friction, full context.' },
                                { e: '🎙️', t: 'Natural Voice AI',           d: 'Unhurried, empathetic voice agents calibrated for the sensitivity of insurance conversations.' },
                                { e: '⚡', t: 'Context-Rich Handoffs',      d: 'When AI hands off, your licensed agent receives full call context — no re-qualifying.' },
                                { e: '📋', t: 'Audit-Ready Logs',           d: 'Every call transcribed, timestamped, and stored. QA, compliance, and training in one place.' },
                                { e: '💰', t: 'Up to 70% Cost Reduction',   d: 'AI handles routine volume so your licensed agents focus exclusively on closing qualified leads.' },
                            ].map((f, i) => (
                                <div key={i} className="mini-card">
                                    <div style={{ fontSize: 26, marginBottom: 12 }}>{f.e}</div>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.01em' }}>{f.t}</h3>
                                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{f.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* LIVE DEMO */}
                <section style={{ padding: '96px 24px', background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 52 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 22 }}>
                                <span className="live-dot" />
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live Agents Available Now</span>
                            </div>
                            <h2 className="display" style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: 14 }}>
                                Call our AI — right now.
                            </h2>
                            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
                                Pick a use case and experience a fully compliant AI voice conversation firsthand. No sign-up required.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, maxWidth: 840, margin: '0 auto' }}>
                            {[
                                { label: 'Medicare Inquiries',       number: '938-204-1672', tel: '9382041672', tag: 'Medicare / AEP', color: '#3b82f6' },
                                { label: 'Final Expense Insurance',  number: '786-605-3428', tel: '7866053428', tag: 'Life Insurance',  color: '#8b5cf6' },
                                { label: 'Personal Loan Inquiries',  number: '938-204-1772', tel: '9382041772', tag: 'Financial',       color: '#06b6d4' },
                            ].map((d, i) => (
                                <a key={i} href={`tel:${d.tel}`} className="demo-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: d.color, background: `${d.color}18`, padding: '4px 10px', borderRadius: 100, border: `1px solid ${d.color}38` }}>{d.tag}</div>
                                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16, color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>{d.label}</div>
                                    <div className="display" style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: 14 }}>{d.number}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: d.color, fontWeight: 600 }}>
                                        Tap to call
                                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="lp-cta" style={{ padding: '96px 24px', textAlign: 'center' }}>
                    <div className="cta-tex" />
                    <div style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
                        <h2 className="display" style={{ fontSize: 'clamp(28px, 5vw, 50px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#fff', marginBottom: 18 }}>
                            Ready to modernize your call center?
                        </h2>
                        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, marginBottom: 40 }}>
                            Join agencies using CallMark AI to reduce costs, stay compliant, and give customers a better experience — every call.
                        </p>
                        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/login" className="btn-white" style={{ padding: '14px 30px', borderRadius: 100 }}>Get Started Free</Link>
                            <Link to="/dashboard" className="btn-ghost-white" style={{ padding: '14px 30px', borderRadius: 100, borderColor: 'rgba(255,255,255,0.3)' }}>Access Dashboard</Link>
                        </div>
                        <p style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            No setup fees · TCPA-Compliant · Cancel anytime
                        </p>
                    </div>
                </section>

                {/* FOOTER */}
                <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '28px 24px', textAlign: 'center' }}>
                    <div className="display" style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginBottom: 8, letterSpacing: '-0.02em' }}>CallMark AI</div>
                    <p style={{ fontSize: 12, color: '#475569' }}>
                        © {new Date().getFullYear()} CallMark AI. All rights reserved. · Built with care for the humans on both ends of the call.
                    </p>
                </footer>

                {/* MODAL */}
                {showPreview && (
                    <div onClick={() => setShowPreview(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(8px)' }}>
                        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, maxWidth: 500, width: '100%', overflow: 'hidden', boxShadow: '0 32px 80px rgba(15,23,42,0.4)' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div>
                                    <h3 className="display" style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Feature Preview</h3>
                                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Supervisor Dashboard & Live Monitor</p>
                                </div>
                                <button onClick={() => setShowPreview(false)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'background 0.15s' }}
                                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#cbd5e1')}
                                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div style={{ padding: 32, textAlign: 'center' }}>
                                <div style={{ fontSize: 44, marginBottom: 14 }}>🚀</div>
                                <h4 className="display" style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 10 }}>More Details Coming Soon</h4>
                                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 340, margin: '0 auto 24px' }}>
                                    We're finalizing our analytics and agent tools. In the meantime, call one of our live demo lines to experience the AI firsthand.
                                </p>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button onClick={() => setShowPreview(false)} className="btn-ghost-blue" style={{ padding: '10px 20px', borderRadius: 100 }}>Close</button>
                                    <a href="tel:9382041672" className="btn-primary" style={{ padding: '10px 20px', borderRadius: 100 }}>Call Demo Line</a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
