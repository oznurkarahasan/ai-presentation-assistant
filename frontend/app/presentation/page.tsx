"use client";

import { Suspense } from "react";
import { PresentationProvider } from "./PresentationContext";
import PresentationContent from "./PresentationContent";

export default function PresentationPage() {
    return (
        <PresentationProvider>
            <Suspense fallback={
                <div className="flex items-center justify-center h-screen bg-black text-white">
                    <div className="bg-grid" />
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <PresentationContent />
            </Suspense>
        </PresentationProvider>
    );
}