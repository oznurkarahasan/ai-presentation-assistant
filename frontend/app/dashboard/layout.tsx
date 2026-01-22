'use client';

import React, { Suspense } from "react";
import { DashboardProvider, useDashboard } from "./DashboardContext";
import {
    LayoutDashboard,
    Presentation,
    History,
    Settings,
    LogOut,
    Upload,
    X,
    Menu,
    Search,
    Bell,
    User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative group overflow-hidden ${active
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
        >
            {active && (
                <motion.div
                    layoutId="nav-bg"
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-primary z-0"
                />
            )}
            <div className={`relative z-10 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
            </div>
            <span className={`relative z-10 font-semibold text-sm tracking-tight transition-all duration-300 ${active ? 'ml-1' : ''}`}>
                {label}
            </span>
        </button>
    );
}

function Sidebar() {
    const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen, handleLogout } = useDashboard();

    return (
        <AnimatePresence>
            {(sidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
                <motion.aside
                    initial={{ x: -300 }}
                    animate={{ x: 0 }}
                    exit={{ x: -300 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className={`fixed lg:static inset-y-0 left-0 w-72 z-40 bg-[#080808] border-r border-white/5 flex flex-col p-6 gap-8 shadow-2xl lg:shadow-none h-full`}
                >
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center shadow-lg rotate-3 overflow-hidden transition-transform hover:rotate-0">
                            <Image src="/favicon.ico" alt="PreCue.ai Icon" width={24} height={24} className="object-contain" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold font-display tracking-tight">
                                PreCue<span className="text-primary">.ai</span>
                            </span>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1">
                        <NavItem
                            icon={<LayoutDashboard size={20} />}
                            label="Overview"
                            active={activeTab === 'overview'}
                            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
                        />
                        <NavItem
                            icon={<Presentation size={20} />}
                            label="My Presentations"
                            active={activeTab === 'presentations'}
                            onClick={() => { setActiveTab('presentations'); setSidebarOpen(false); }}
                        />
                        <NavItem
                            icon={<History size={20} />}
                            label="History"
                            active={activeTab === 'sessions'}
                            onClick={() => { setActiveTab('sessions'); setSidebarOpen(false); }}
                        />
                        <div className="pt-4 pb-2 px-4">
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Actions</span>
                        </div>
                        <Link href="/upload" onClick={() => setSidebarOpen(false)}>
                            <button className="w-full p-4 rounded-2xl flex items-center gap-4 text-zinc-500 hover:text-zinc-300 transition-all font-semibold text-sm h-[52px]">
                                <Upload size={20} />
                                New Presentation
                            </button>
                        </Link>
                        <button className="w-full p-4 rounded-2xl flex items-center gap-4 text-zinc-500 hover:text-zinc-300 transition-all font-semibold text-sm h-[52px]">
                            <Settings size={20} />
                            Settings
                        </button>
                    </nav>

                    <div className="mt-auto space-y-4">
                        <button
                            onClick={handleLogout}
                            className="w-full p-4 rounded-xl flex items-center gap-3 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-sm font-medium border border-transparent hover:border-white/5"
                        >
                            <LogOut size={18} />
                            Log Out
                        </button>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

function Header() {
    const { user, searchQuery, setSearchQuery } = useDashboard();

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    if (!user) return null;

    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mb-2">
                    {getTimeGreeting()}, <span className="text-primary">{user.full_name?.split(' ')[0] || 'User'}</span>
                </h1>
                <p className="text-zinc-500 text-sm sm:text-base max-w-md">
                    Your presentation assistant is ready to work with you today.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
            >
                <div className="relative group hidden sm:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search presentations..."
                        className="bg-[#101010] border border-white/5 rounded-full pl-11 pr-6 py-2.5 text-sm focus:outline-none focus:border-primary/50 w-64 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="p-3 rounded-full bg-[#101010] border border-white/5 text-zinc-400 hover:text-white relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-black"></span>
                </button>
                <div className="h-10 w-[1px] bg-white/5 mx-2 hidden sm:block"></div>
                <div className="flex items-center gap-3 bg-[#101010] p-1 pr-4 rounded-full border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <User size={18} />
                    </div>
                    <span className="text-sm font-medium hidden sm:block">Profile</span>
                </div>
            </motion.div>
        </header>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { loading, sidebarOpen, setSidebarOpen } = useDashboard();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black relative w-full">
                <div className="bg-grid" />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-12 h-12 border-t-2 border-primary rounded-full relative z-10"
                />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-primary/30 selection:text-primary w-full overflow-hidden">
            <div className="bg-grid" />

            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-6 left-6 z-50 lg:hidden p-3 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/5 text-zinc-400 hover:text-white transition-all shadow-2xl"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Sidebar />

            <main className="flex-1 overflow-y-auto relative z-10 px-6 py-8 lg:px-12">
                <div className="max-w-[1400px] mx-auto">
                    <Header />
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div className="h-screen bg-black" />}>
            <DashboardProvider>
                <DashboardLayoutContent>
                    {children}
                </DashboardLayoutContent>
            </DashboardProvider>
        </Suspense>
    );
}
