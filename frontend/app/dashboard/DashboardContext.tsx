'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import client from "../api/client";

export interface UserProfile {
    id: number;
    email: string;
    full_name: string | null;
    birth_date: string | null;
    is_active: boolean;
}

export interface DashboardStats {
    total_presentations: number;
    total_rehearsal_hours: number;
    total_live_hours: number;
    total_sessions: number;
    avg_session_minutes: number;
}

export interface RecentPresentation {
    id: number;
    title: string;
    file_name: string;
    file_type: string;
    slide_count: number;
    status: string;
    created_at: string;
}

export interface RecentSession {
    id: number;
    session_type: string;
    duration_minutes: number;
    started_at: string;
    ended_at: string | null;
    presentation: {
        id: number;
        title: string;
        slide_count: number;
    };
}

interface DashboardContextType {
    user: UserProfile | null;
    stats: DashboardStats | null;
    recentPresentations: RecentPresentation[];
    recentSessions: RecentSession[];
    presentations: RecentPresentation[];
    loading: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleLogout: () => void;
    refreshData: () => Promise<void>;
    setAlert: (alert: { type: 'info' | 'error', message: string } | null) => void;
    alert: { type: 'info' | 'error', message: string } | null;
    setStats: React.Dispatch<React.SetStateAction<DashboardStats | null>>;
    setRecentPresentations: React.Dispatch<React.SetStateAction<RecentPresentation[]>>;
    setPresentations: React.Dispatch<React.SetStateAction<RecentPresentation[]>>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentPresentations, setRecentPresentations] = useState<RecentPresentation[]>([]);
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
    const [presentations, setPresentations] = useState<RecentPresentation[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [alert, setAlert] = useState<{ type: 'info' | 'error', message: string } | null>(null);

    const activeTab = searchParams.get('tab') || 'overview';

    const setActiveTab = useCallback((tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/dashboard?${params.toString()}`);
    }, [router, searchParams]);

    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const [userRes, allRes] = await Promise.all([
                client.get("/api/v1/auth/me"),
                client.get("/api/v1/presentations/")
            ]);

            const allPresentations = allRes.data || [];
            setUser(userRes.data);
            setPresentations(allPresentations);
            setRecentPresentations(allPresentations.slice(0, 5));
            setStats({
                total_presentations: allPresentations.length,
                total_rehearsal_hours: 0,
                total_live_hours: 0,
                total_sessions: 0,
                avg_session_minutes: 0
            });
            setRecentSessions([]);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            localStorage.removeItem("access_token");
            router.push("/login");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        router.push("/login");
    };

    return (
        <DashboardContext.Provider value={{
            user, stats, recentPresentations, recentSessions, presentations,
            loading, activeTab, setActiveTab, sidebarOpen, setSidebarOpen,
            searchQuery, setSearchQuery, handleLogout, refreshData: fetchDashboardData,
            alert, setAlert, setStats, setRecentPresentations, setPresentations
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
};
