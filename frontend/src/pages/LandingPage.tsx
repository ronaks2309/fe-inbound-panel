import { useState } from 'react'
import { Link } from 'react-router-dom'

export const LandingPage = () => {
    const [showPreview, setShowPreview] = useState(false)

    const features = [
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            ),
            title: 'Compliance by Design',
            desc: 'TCPA-aware flows, required disclosures, and compliant call handling — baked in from the start, not bolted on after.',
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            title: 'Human Supervision',
            desc: 'Supervisors monitor every active call in real-time and take over instantly — one click, zero friction.',
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            ),
            title: 'Natural Conversations',
            desc: 'Voice agents trained to sound human — unhurried, empathetic, and calibrated for sensitive insurance topics.',
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            title: 'Context-Rich Handoffs',
            desc: 'When AI hands off, your licensed agent receives full context — no repetition, no re-qualifying from scratch.',
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            title: 'Audit-Ready Logs',
            desc: 'Every call transcribed, timestamped, and stored. QA reviews, compliance audits, and agent training — all in one place.',
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: 'Up to 70% Cost Reduction',
            desc: 'AI handles routine volume so your team focuses on closing. Less overhead, more conversions.',
        },
    ]

    const demoLines = [
        { label: 'Medicare Inquiries', number: '938-204-1672', tel: '9382041672', tag: 'Medicare / AEP' },
        { label: 'Final Expense Insurance', number: '786-605-3428', tel: '7866053428', tag: 'Life Insurance' },
        { label: 'Personal Loan Inquiries', number: '938-204-1772', tel: '9382041772', tag: 'Financial' },
    ]

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Outfit:wght@300;400;500;600&display=swap');

                .lp { font-family: 'Outfit', sans-serif; background: #07090f; color: #edeae3; }

                .display { font-family: 'Cormorant Garamond', Georgia, serif; }

                /* Orbs */
                @keyframes orb-drift {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.08); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }
                .orb { animation: orb-drift 14s ease-in-out infinite; }
                .orb-b { animation: orb-drift 18s ease-in-out infinite reverse; }

                /* Fade-up reveals */
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(28px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fu-1 { animation: fade-up 0.75s cubic-bezier(.22,1,.36,1) 0.1s both; }
                .fu-2 { animation: fade-up 0.75s cubic-bezier(.22,1,.36,1) 0.3s both; }
                .fu-3 { animation: fade-up 0.75s cubic-bezier(.22,1,.36,1) 0.5s both; }
                .fu-4 { animation: fade-up 0.75s cubic-bezier(.22,1,.36,1) 0.7s both; }

                /* Live pulse */
                @keyframes pulse-ring {
                    0%   { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                .live-pip { position: relative; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }
                .live-pip::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    background: #4ade80;
                    animation: pulse-ring 1.8s ease-out infinite;
                }

                /* Grid texture */
                .grid-tex {
                    background-image:
                        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
                    background-size: 72px 72px;
                }

                /* Gold gradient text */
                .gold-text {
                    background: linear-gradient(120deg, #f5a623 0%, #fcd34d 50%, #f5a623 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* Buttons */
                .btn-primary {
                    background: linear-gradient(135deg, #f5a623, #d97706);
                    color: #07090f;
                    font-weight: 600;
                    letter-spacing: 0.01em;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 24px rgba(245,166,35,0.28);
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 32px rgba(245,166,35,0.4);
                }

                .btn-ghost {
                    border: 1px solid rgba(255,255,255,0.14);
                    color: rgba(237,234,227,0.85);
                    background: rgba(255,255,255,0.04);
                    transition: all 0.2s ease;
                }
                .btn-ghost:hover {
                    border-color: rgba(255,255,255,0.28);
                    background: rgba(255,255,255,0.08);
                }

                /* Feature cards */
                .feat-card {
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(255,255,255,0.03);
                    transition: all 0.25s ease;
                }
                .feat-card:hover {
                    border-color: rgba(245,166,35,0.3);
                    background: rgba(245,166,35,0.04);
                    transform: translateY(-4px);
                }

                /* Demo cards */
                .demo-card {
                    border: 1px solid rgba(255,255,255,0.09);
                    background: rgba(255,255,255,0.03);
                    transition: all 0.25s ease;
                    cursor: pointer;
                }
                .demo-card:hover {
                    border-color: rgba(245,166,35,0.45);
                    background: rgba(245,166,35,0.06);
                    transform: translateY(-3px);
                    box-shadow: 0 12px 40px rgba(245,166,35,0.12);
                }

                /* Gold rule */
                .gold-rule { width: 36px; height: 2px; background: linear-gradient(90deg, #f5a623, #fcd34d); border-radius: 2px; }

                /* Light section */
                .section-light { background: #f5f2eb; color: #111; }

                /* Stats */
                .stat-num {
                    font-family: 'Cormorant Garamond', serif;
                    font-weight: 700;
                    background: linear-gradient(120deg, #f5a623, #fcd34d);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* Modal backdrop */
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoom-in { from { transform: scale(0.96); } to { transform: scale(1); } }
                .modal-backdrop { animation: fade-in 0.2s ease both; }
                .modal-box { animation: zoom-in 0.25s cubic-bezier(.22,1,.36,1) both; }

                /* Nav */
                .nav-blur {
                    background: rgba(7,9,15,0.85);
                    backdrop-filter: blur(16px);
                    border-bottom: 1px solid rgba(255,255,255,0.07);
                }

                a { text-decoration: none; }
            `}</style>

            <div className="lp">

                {/* ── Navigation ── */}
                <header className="nav-blur sticky top-0 z-40 w-full">
                    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="display" style={{ fontSize: 22, fontWeight: 700, color: '#f5a623', letterSpacing: '-0.01em' }}>
                            CallMark AI
                        </div>
                        <nav style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Link to="/login" style={{ color: 'rgba(237,234,227,0.7)', fontSize: 14, fontWeight: 500, padding: '8px 16px', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#edeae3')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(237,234,227,0.7)')}>
                                Sign In
                            </Link>
                            <Link to="/login" className="btn-primary" style={{ padding: '9px 22px', borderRadius: 100, fontSize: 14, display: 'inline-block' }}>
                                Get Started
                            </Link>
                        </nav>
                    </div>
                </header>

                {/* ── Hero ── */}
                <section className="grid-tex" style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px 120px' }}>
                    {/* Ambient orbs */}
                    <div className="orb" style={{ position: 'absolute', top: '-10%', right: '5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div className="orb-b" style={{ position: 'absolute', bottom: '-20%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
                        <div style={{ maxWidth: 760 }}>
                            {/* Eyebrow */}
                            <div className="fu-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 100, padding: '6px 14px', marginBottom: 32 }}>
                                <span className="live-pip" />
                                <span style={{ fontSize: 13, fontWeight: 500, color: '#f5a623', letterSpacing: '0.04em' }}>LIVE AI VOICE AGENTS — INSURANCE</span>
                            </div>

                            {/* Headline */}
                            <h1 className="display fu-2" style={{ fontSize: 'clamp(44px, 6vw, 78px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: 28, color: '#f5f2eb' }}>
                                Where AI handles<br />
                                the volume.{' '}
                                <em className="gold-text" style={{ fontStyle: 'italic' }}>Humans handle</em>
                                <br />the moments that matter.
                            </h1>

                            {/* Subtext */}
                            <p className="fu-3" style={{ fontSize: 18, lineHeight: 1.7, color: 'rgba(237,234,227,0.65)', maxWidth: 560, marginBottom: 44 }}>
                                Compliance-first AI voice agents for Life and Health Insurance — qualifying leads, asking the right questions, and handing off to your licensed agents with full context and confidence.
                            </p>

                            {/* CTAs */}
                            <div className="fu-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 52 }}>
                                <button onClick={() => setShowPreview(true)} className="btn-primary" style={{ padding: '15px 32px', borderRadius: 100, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    See It in Action
                                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                                <Link to="/dashboard" className="btn-ghost" style={{ padding: '15px 32px', borderRadius: 100, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    Access Dashboard
                                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>

                            {/* Trust line */}
                            <p style={{ fontSize: 12, color: 'rgba(237,234,227,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
                                Built with TCPA-aware flows · Audit-ready call handling · Real-time human supervision
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── Stats Bar ── */}
                <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        {[
                            { num: '70%', label: 'Reduction in call center overhead' },
                            { num: '100%', label: 'TCPA-compliant call flows' },
                            { num: '<2s', label: 'AI response latency' },
                            { num: '24 / 7', label: 'Always-on inbound coverage' },
                        ].map((s, i) => (
                            <div key={i} style={{ padding: '36px 24px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', textAlign: 'center' }}>
                                <div className="stat-num" style={{ fontSize: 42, lineHeight: 1, marginBottom: 8 }}>{s.num}</div>
                                <div style={{ fontSize: 13, color: 'rgba(237,234,227,0.45)', lineHeight: 1.5 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Story ── */}
                <section className="section-light" style={{ padding: '96px 24px' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 72, alignItems: 'center' }}>
                        {/* Left */}
                        <div>
                            <div className="gold-rule" style={{ marginBottom: 20 }} />
                            <h2 className="display" style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#0d0f1a', marginBottom: 24 }}>
                                Insurance calls aren't like other calls.
                            </h2>
                            <p style={{ fontSize: 17, color: '#4a4a4a', lineHeight: 1.8, marginBottom: 20 }}>
                                A Medicare agency came to us with a hard truth: every AI solution they'd tried had the same breaking point. Two out of ten calls would go sideways — confused customers, compliance gaps, damaged trust.
                            </p>
                            <p style={{ fontSize: 17, color: '#4a4a4a', lineHeight: 1.8 }}>
                                The answer wasn't better AI in isolation. It was AI and humans working together — agents elevated from call-takers to supervisors, always one click away when it matters most.
                            </p>
                        </div>
                        {/* Right — quote card */}
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: -2, background: 'linear-gradient(135deg, #f5a623, #d97706)', borderRadius: 20, opacity: 0.15 }} />
                            <div style={{ position: 'relative', background: '#0d0f1a', borderRadius: 18, padding: 40, color: '#edeae3' }}>
                                <div className="display" style={{ fontSize: 64, lineHeight: 0.8, color: '#f5a623', opacity: 0.6, marginBottom: 16 }}>"</div>
                                <p className="display" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 600, lineHeight: 1.5, marginBottom: 24, color: '#f5f2eb' }}>
                                    We didn't want to replace our agents. We wanted to give them a superpower.
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #f5a623, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#07090f' }}>M</div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#edeae3' }}>Medicare Agency Director</div>
                                        <div style={{ fontSize: 12, color: 'rgba(237,234,227,0.45)' }}>CallMark AI Customer</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Features ── */}
                <section style={{ padding: '96px 24px', background: '#07090f' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        {/* Header */}
                        <div style={{ marginBottom: 64, maxWidth: 520 }}>
                            <div className="gold-rule" style={{ marginBottom: 20 }} />
                            <h2 className="display" style={{ fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#f5f2eb', marginBottom: 16 }}>
                                Everything you need. Nothing you don't.
                            </h2>
                            <p style={{ fontSize: 16, color: 'rgba(237,234,227,0.55)', lineHeight: 1.7 }}>
                                Built specifically for the compliance demands and human stakes of Life and Health Insurance.
                            </p>
                        </div>

                        {/* Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                            {features.map((f, i) => (
                                <div key={i} className="feat-card" style={{ borderRadius: 16, padding: 32 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5a623', marginBottom: 20 }}>
                                        {f.icon}
                                    </div>
                                    <h3 style={{ fontSize: 17, fontWeight: 600, color: '#f5f2eb', marginBottom: 10, letterSpacing: '-0.01em' }}>{f.title}</h3>
                                    <p style={{ fontSize: 14, color: 'rgba(237,234,227,0.5)', lineHeight: 1.75 }}>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Live Demo ── */}
                <section style={{ padding: '96px 24px', background: '#0a0d16', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 64 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 100, padding: '6px 16px' }}>
                                <span className="live-pip" />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live Agents Available Now</span>
                            </div>
                            <h2 className="display" style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#f5f2eb', marginBottom: 16 }}>
                                Call our AI — right now.
                            </h2>
                            <p style={{ fontSize: 16, color: 'rgba(237,234,227,0.5)', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
                                Pick a use case below and experience a fully compliant AI voice conversation firsthand.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' }}>
                            {demoLines.map((d, i) => (
                                <a key={i} href={`tel:${d.tel}`} className="demo-card" style={{ borderRadius: 18, padding: '32px 28px', display: 'block' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f5a623', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', padding: '4px 10px', borderRadius: 100 }}>
                                            {d.tag}
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 18, height: 18, color: 'rgba(237,234,227,0.25)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 13, color: 'rgba(237,234,227,0.45)', marginBottom: 6, fontWeight: 500 }}>{d.label}</div>
                                        <div className="display" style={{ fontSize: 28, fontWeight: 700, color: '#f5f2eb', letterSpacing: '-0.01em' }}>{d.number}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: 13, color: '#f5a623', fontWeight: 500 }}>
                                        Tap to call
                                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section style={{ padding: '100px 24px', background: '#07090f', position: 'relative', overflow: 'hidden', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(245,166,35,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
                        <div className="gold-rule" style={{ margin: '0 auto 28px' }} />
                        <h2 className="display" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#f5f2eb', marginBottom: 20 }}>
                            Ready to modernize your call center?
                        </h2>
                        <p style={{ fontSize: 17, color: 'rgba(237,234,227,0.55)', lineHeight: 1.7, marginBottom: 40 }}>
                            Join agencies using CallMark AI to reduce costs, stay compliant, and give their customers a better experience — every call.
                        </p>
                        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/login" className="btn-primary" style={{ padding: '16px 36px', borderRadius: 100, fontSize: 15, display: 'inline-block' }}>
                                Get Started Free
                            </Link>
                            <Link to="/dashboard" className="btn-ghost" style={{ padding: '16px 36px', borderRadius: 100, fontSize: 15, display: 'inline-block' }}>
                                Access Dashboard
                            </Link>
                        </div>
                        <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(237,234,227,0.25)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            No setup fees · TCPA-Compliant · Cancel anytime
                        </p>
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#05060d', padding: '32px 24px', textAlign: 'center' }}>
                    <div className="display" style={{ fontSize: 18, fontWeight: 700, color: '#f5a623', marginBottom: 10 }}>CallMark AI</div>
                    <p style={{ fontSize: 12, color: 'rgba(237,234,227,0.25)', letterSpacing: '0.02em' }}>
                        © {new Date().getFullYear()} CallMark AI. All rights reserved. · Built with care for the humans on both ends of the call.
                    </p>
                </footer>

                {/* ── Preview Modal ── */}
                {showPreview && (
                    <div className="modal-backdrop" onClick={() => setShowPreview(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, maxWidth: 560, width: '100%', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
                            <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 className="display" style={{ fontSize: 22, fontWeight: 700, color: '#f5f2eb', marginBottom: 2 }}>Feature Preview</h3>
                                    <p style={{ fontSize: 13, color: 'rgba(237,234,227,0.4)' }}>Supervisor Dashboard & Live Monitor</p>
                                </div>
                                <button onClick={() => setShowPreview(false)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(237,234,227,0.6)', transition: 'background 0.2s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div style={{ padding: 32, textAlign: 'center' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
                                <h4 className="display" style={{ fontSize: 24, fontWeight: 700, color: '#f5f2eb', marginBottom: 12 }}>More Details Coming Soon</h4>
                                <p style={{ fontSize: 15, color: 'rgba(237,234,227,0.5)', lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
                                    We're putting the finishing touches on advanced analytics and agent supervision tools. In the meantime — call one of our live demo lines to experience the AI firsthand.
                                </p>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                    <button onClick={() => setShowPreview(false)} className="btn-ghost" style={{ padding: '10px 24px', borderRadius: 100, fontSize: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: 'rgba(237,234,227,0.7)', cursor: 'pointer' }}>
                                        Close
                                    </button>
                                    <a href="tel:9382041672" className="btn-primary" style={{ padding: '10px 24px', borderRadius: 100, fontSize: 14, display: 'inline-block' }}>
                                        Call Demo Line
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
