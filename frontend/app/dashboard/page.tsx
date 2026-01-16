'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Presentation, History, Settings, LogOut } from "lucide-react";
import client from "../api/client";

interface UserProfile {
    id: number;
    email: string;
    full_name: string | null;
    birth_date: string | null;
    is_active: boolean;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const response = await client.get("/api/v1/auth/me");
                setUser(response.data);
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
                localStorage.removeItem("access_token");
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex h-screen bg-black">
            {/* Sidebar */}
            <aside className="w-64 border-r border-zinc-800 flex flex-col">
                <div className="p-6 font-bold text-xl flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">AI</div>
                    AI Presentation Assistant
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <SidebarItem icon={<LayoutDashboard size={20} />} label="Overview" active />
                    <SidebarItem icon={<Presentation size={20} />} label="My Presentations" />
                    <SidebarItem icon={<History size={20} />} label="History" />
                    <SidebarItem icon={<Settings size={20} />} label="Settings" />
                </nav>

                <button
                    onClick={handleLogout}
                    className="p-4 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors border-t border-zinc-800"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Welcome{user.full_name ? `, ${user.full_name}` : ''}!</h1>
                        <p className="text-sm text-zinc-400 mt-1">{user.email}</p>
                    </div>
                    <div className="text-sm text-zinc-500">
                        User ID: #{user.id}
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DashboardCard
                        title="New Presentation"
                        desc="Start a new presentation with voice command support."
                        buttonText="Create"
                        primary
                    />
                    <DashboardCard
                        title="Last Presentation"
                        desc="Marketing Presentation v2.pptx"
                        buttonText="Continue"
                    />
                    <DashboardCard
                        title="Analytics"
                        desc="Total 12 hours of presentation rehearsal done."
                        buttonText="Details"
                    />
                </div>
            </main>
        </div>
    );
}

function SidebarItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
    return (
        <div className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${active ? 'bg-orange-600/10 text-orange-500 border border-orange-600/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}>
            {icon}
            <span className="font-medium">{label}</span>
        </div>
    );
}

function DashboardCard({ title, desc, buttonText, primary = false }: { title: string, desc: string, buttonText: string, primary?: boolean }) {
    return (
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between h-48">
            <div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm">{desc}</p>
            </div>
            <button className={`w-full py-2 rounded-lg font-medium transition-colors ${primary ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
                {buttonText}
            </button>
        </div>
    );
}
