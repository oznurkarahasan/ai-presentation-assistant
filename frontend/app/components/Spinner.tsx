/** Shared loading ring, previously hand-copied with minor size/color
 * variations across ~8 pages/components (analyze, editor, PresentationViewer,
 * AiSlidePreview, ImagePickerModal). */
interface SpinnerProps {
    size?: number;
    borderColorClassName?: string;
    colorHex?: string;
    className?: string;
}

export default function Spinner({ size = 32, borderColorClassName = 'border-primary', colorHex, className = '' }: SpinnerProps) {
    return (
        <div
            className={`border-2 border-t-transparent rounded-full animate-spin ${colorHex ? '' : borderColorClassName} ${className}`.trim()}
            style={{
                width: size,
                height: size,
                ...(colorHex ? { borderColor: colorHex, borderTopColor: 'transparent' } : {}),
            }}
        />
    );
}

/** The inverse-contrast variant used inside submit buttons (opaque white
 * indicator on a translucent white track), previously copy-pasted identically
 * across login, register, forgot-password, and reset-password. */
export function ButtonSpinner() {
    return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}
