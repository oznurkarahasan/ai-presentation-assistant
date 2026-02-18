"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface PresentationContextType {
    currentSlide: number;
    slideCount: number;
    isStarted: boolean;
    isAudioActive: boolean;
    isFullscreen: boolean;
    elapsedTime: number;
    transcript: string;
    presentationTitle: string;

    // Actions
    setCurrentSlide: (slide: number) => void;
    setIsStarted: (started: boolean) => void;
    setIsAudioActive: (active: boolean) => void;
    setIsFullscreen: (fullscreen: boolean) => void;
    setElapsedTime: (time: number | ((prev: number) => number)) => void;
    addTranscript: (text: string) => void;
    setPresentationTitle: (title: string) => void;
    setSlideCount: (count: number) => void;
    handleSlideChange: (slideNumber: number) => void;
    toggleFullscreen: () => void;
}

const PresentationContext = createContext<PresentationContextType | undefined>(undefined);

export const PresentationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentSlide, setCurrentSlide] = useState(1);
    const [slideCount, setSlideCount] = useState(1);
    const [isStarted, setIsStarted] = useState(false);
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [transcript, setTranscript] = useState("");
    const [presentationTitle, setPresentationTitle] = useState("");

    const handleSlideChange = useCallback((slideNumber: number) => {
        if (slideNumber >= 1 && slideNumber <= slideCount) {
            setCurrentSlide(slideNumber);
        }
    }, [slideCount]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    }, []);

    const addTranscript = useCallback((text: string) => {
        setTranscript(prev => {
            // Avoid duplicate entries and manage transcript length
            const lines = prev.split('\n').filter(line => line.trim());
            lines.push(text);
            
            // Keep only last 50 lines to prevent memory issues
            if (lines.length > 50) {
                lines.splice(0, lines.length - 50);
            }
            
            return lines.join('\n');
        });
    }, []);

    return (
        <PresentationContext.Provider value={{
            currentSlide, slideCount, isStarted, isAudioActive, isFullscreen,
            elapsedTime, transcript, presentationTitle,
            setCurrentSlide, setIsStarted, setIsAudioActive, setIsFullscreen,
            setElapsedTime, addTranscript, setPresentationTitle, setSlideCount,
            handleSlideChange, toggleFullscreen
        }}>
            {children}
        </PresentationContext.Provider>
    );
};

export const usePresentation = () => {
    const context = useContext(PresentationContext);
    if (!context) {
        throw new Error('usePresentation must be used within a PresentationProvider');
    }
    return context;
};
