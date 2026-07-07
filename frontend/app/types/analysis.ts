export interface SlideFeedback {
    page_number: number;
    strength: string;
    improvement: string;
}

export interface PresentationAnalysis {
    overall_score: number;
    readability_score: number;
    structure_score: number;
    visual_balance_score: number;
    summary: string;
    slide_feedback: SlideFeedback[];
}
