'use client';

import { Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface PlanCardProps {
    name: string;
    price: string;
    features: string[];
    href: string;
    buttonText: string;
    currentBadge?: string;
    featured?: boolean;
}

function PlanCard({ name, price, features, href, buttonText, currentBadge, featured }: PlanCardProps) {
    return (
        <div
            className={`rounded-2xl p-5 border flex flex-col ${featured
                ? 'bg-gradient-to-b from-primary/10 to-zinc-900 border-primary/40'
                : 'bg-zinc-900/40 border-white/5'
                }`}
        >
            <div className="flex items-center justify-between mb-1">
                <h3 className={`text-sm font-black ${featured ? 'text-primary' : 'text-white'}`}>{name}</h3>
                {currentBadge && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        {currentBadge}
                    </span>
                )}
            </div>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-black text-white">${price}</span>
                <span className="text-xs text-zinc-500">/mo</span>
            </div>
            <div className="space-y-2 mb-5 flex-1">
                {features.map((feature, i) => (
                    <div key={i} className="flex gap-2 items-start">
                        <Check size={12} strokeWidth={3} className={`mt-0.5 shrink-0 ${featured ? 'text-primary' : 'text-zinc-500'}`} />
                        <span className="text-xs text-zinc-300 leading-relaxed">{feature}</span>
                    </div>
                ))}
            </div>
            {!currentBadge && (
                <Link
                    href={href}
                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all ${featured
                        ? 'bg-primary text-black hover:opacity-90'
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                        }`}
                >
                    {buttonText}
                </Link>
            )}
        </div>
    );
}

export default function Billing() {
    const t = useTranslations('billing');
    const tPricing = useTranslations('pricing');

    const freeFeatures = [tPricing('freeFeature0'), tPricing('freeFeature1'), tPricing('freeFeature2'), tPricing('freeFeature3')];
    const proFeatures = [tPricing('proFeature0'), tPricing('proFeature1'), tPricing('proFeature2'), tPricing('proFeature3'), tPricing('proFeature4'), tPricing('proFeature5')];

    return (
        <div className="max-w-3xl space-y-6">
            <p className="text-sm text-zinc-500">{t('subtitle')}</p>

            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">{t('currentPlanLabel')}</span>
                    <h2 className="text-xl font-black text-white mt-1">{tPricing('freeName')}</h2>
                    <p className="text-sm text-zinc-500 mt-1">{t('freeActiveNote')}</p>
                </div>
                <Link
                    href="/pricing?plan=pro"
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-black text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shrink-0"
                >
                    {t('upgradeButton')}
                    <ExternalLink size={14} />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlanCard
                    name={tPricing('freeName')}
                    price="0"
                    features={freeFeatures}
                    href="/pricing"
                    buttonText={tPricing('freeButton')}
                    currentBadge={t('currentBadge')}
                />
                <PlanCard
                    name={tPricing('proName')}
                    price="9.99"
                    features={proFeatures}
                    href="/pricing?plan=pro"
                    buttonText={tPricing('proButton')}
                    featured
                />
            </div>

            <Link
                href="/pricing"
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
            >
                {t('viewAllPlans')}
                <ExternalLink size={12} />
            </Link>
        </div>
    );
}
