/**
 * @leanmcp/ui Showcase
 * 
 * AVANT-GARDE EDITION
 * A high-fashion, experimental showcase for the MCP-Native UI SDK.
 */
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Sparkles,
    Command,
    Fingerprint,
    Aperture,
    Grid,
    Activity,
    Cpu
} from 'lucide-react';
import '@leanmcp/ui/styles.css';
import '../src/styles/globals.css';
import { Toaster } from '../src/components/ui/sonner';

import { CoreShowcase } from './core';
import { FormShowcase } from './forms';
import { FeedbackShowcase } from './feedback';
import { LayoutShowcase } from './layout';
import { DataShowcase } from './data';
import { HooksShowcase } from './hooks';
import { McpShowcase } from './mcp';

// --- Configuration ---

const showcases = [
    { id: 'mcp', label: 'MCP NATIVE', component: McpShowcase, icon: Sparkles, index: '01' },
    { id: 'core', label: 'CORE', component: CoreShowcase, icon: Command, index: '02' },
    { id: 'forms', label: 'FORMS', component: FormShowcase, icon: Fingerprint, index: '03' },
    { id: 'data', label: 'DATA', component: DataShowcase, icon: Grid, index: '04' },
    { id: 'layout', label: 'LAYOUT', component: LayoutShowcase, icon: Aperture, index: '05' },
    { id: 'feedback', label: 'FEEDBACK', component: FeedbackShowcase, icon: Activity, index: '06' },
    { id: 'hooks', label: 'HOOKS', component: HooksShowcase, icon: Cpu, index: '07' },
];

function App() {
    const [activeShowcase, setActiveShowcase] = useState('mcp');
    const [scrolled, setScrolled] = useState(false);

    // Default to dark mode for that "premium night" look
    const [isDark, setIsDark] = useState(true);

    const activeItem = showcases.find(s => s.id === activeShowcase);
    const ActiveComponent = activeItem?.component;

    // Handle scroll effects
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            className={`min-h-screen transition-colors duration-500 selection:bg-rose-500 selection:text-white ${isDark ? 'dark bg-[#0a0a0a] text-white' : 'bg-zinc-50 text-zinc-900'}`}
            data-theme={isDark ? 'dark' : 'light'}
        >
            {/* Noise Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-600/10 blur-[120px] animate-pulse duration-[10s]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-rose-600/10 blur-[120px] animate-pulse duration-[12s]" />
            </div>

            {/* Navigation - Minimalist Floating Bar */}
            <nav className={`
                fixed top-8 left-1/2 -translate-x-1/2 z-50 
                flex items-center gap-1 p-1.5 rounded-full 
                bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-500
                ${scrolled ? 'scale-90 opacity-80 hover:opacity-100 hover:scale-100' : 'scale-100'}
            `}>
                {showcases.map((item) => {
                    const isActive = activeShowcase === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' }) || setActiveShowcase(item.id)}
                            className={`
                                relative group px-4 py-2 rounded-full text-xs font-medium tracking-widest transition-all duration-300
                                ${isActive ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}
                            `}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Icon size={14} className={isActive ? 'text-black' : ''} />
                                {isActive && <span>{item.label}</span>}
                            </span>
                        </button>
                    );
                })}

                <div className="w-[1px] h-4 bg-white/10 mx-2" />

                <button
                    onClick={() => setIsDark(!isDark)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-500 hover:text-white"
                >
                    <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-rose-500 box-shadow-glow' : 'bg-amber-400'}`} />
                </button>
            </nav>

            {/* Main Stage */}
            <main className="relative z-10 pt-40 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen flex flex-col items-center">

                {/* Hero Title */}
                <header className="w-full flex flex-col items-center justify-center mb-32 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 mb-6 border border-zinc-800 px-4 py-1 rounded-full">
                        Collection 2024 / {activeItem?.index}
                    </span>
                    <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 mb-6 drop-shadow-2xl">
                        {activeItem?.label}
                    </h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />
                </header>

                {/* Content Render */}
                <div className="w-full relative">
                    <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-zinc-800 to-transparent hidden md:block" />
                    <div className="absolute right-4 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-zinc-800 to-transparent hidden md:block" />

                    <div className="md:px-20 animate-in fade-in duration-700 delay-200">
                        {ActiveComponent && <ActiveComponent theme={isDark ? 'dark' : 'light'} />}
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="relative z-10 py-12 text-center text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
                <p>Designed for Agents • LeanMCP SDK • v0.2.0</p>
            </footer>

            {/* High Visibility Toaster */}
            <Toaster
                theme={isDark ? 'dark' : 'light'}
                position="top-center"
                className="!bg-zinc-900/90 !backdrop-blur-xl !border-violet-500/50 !text-white !shadow-[0_0_30px_rgba(139,92,246,0.3)] !rounded-2xl"
                toastOptions={{
                    style: {
                        background: 'rgba(23, 23, 23, 0.95)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: 'white',
                        padding: '16px 24px',
                        fontSize: '15px'
                    }
                }}
            />

            <style>{`
                ::selection {
                    background: #f43f5e;
                    color: white;
                }
                .box-shadow-glow {
                    box-shadow: 0 0 10px rgba(244, 63, 94, 0.5);
                }
                /* Custom Scrollbar */
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 3px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #444;
                }
            `}</style>
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<App />);
}
