"use client";

import { Layout } from "lucide-react";
import { usePresentation } from "./PresentationContext";

interface Props {
    pdfUrl: string;
    isPdf: boolean;
}

const PDFViewer = ({ pdfUrl, isPdf }: Props) => {
    const { currentSlide, slideCount, isStarted, presentationTitle } = usePresentation();

    return (
        <div className={`relative transition-all duration-700 w-full h-full flex items-center justify-center p-2 ${!isStarted ? 'opacity-40 blur-sm scale-[0.98]' : 'opacity-100 blur-0 scale-100'}`}>
            <div className="w-full h-full max-w-[1400px] bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
                {isPdf ? (
                    <div className="absolute inset-x-[-1px] inset-y-[-1px] overflow-hidden bg-white rounded-[2.5rem]">
                        <div className="absolute inset-0 overflow-hidden">
                            <iframe
                                key={currentSlide}
                                src={`${pdfUrl}#page=${currentSlide}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                className="absolute top-0 left-0 w-[calc(100%+32px)] h-full border-none opacity-90"
                                title={presentationTitle}
                                style={{ pointerEvents: 'none' }}
                            />
                        </div>
                        <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.05)]" />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-zinc-900 to-black">
                        <Layout size={64} className="text-primary/20 mb-6" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 text-zinc-100">Live Control Deck</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] max-w-[240px] leading-relaxed mb-6">
                            PowerPoint visuals are rendered structure-only in Browser Live Mode.
                        </p>
                        <div className="bg-primary/10 border border-primary/20 px-6 py-3 rounded-2xl">
                            <span className="text-white font-black text-2xl font-mono italic">SLIDE {currentSlide}</span>
                            <span className="mx-2 text-zinc-600 font-black">/</span>
                            <span className="text-zinc-500 font-black">{slideCount}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFViewer;
