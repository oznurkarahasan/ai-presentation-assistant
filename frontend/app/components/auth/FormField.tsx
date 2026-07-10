import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: LucideIcon;
    labelExtra?: ReactNode;
}

export default function FormField({ label, icon: Icon, labelExtra, className, ...inputProps }: FormFieldProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-zinc-300">{label}</label>
                {labelExtra}
            </div>
            <div className="relative group">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <input
                    {...inputProps}
                    className={`input-field pl-11 ${className ?? ''}`}
                />
            </div>
        </div>
    );
}
