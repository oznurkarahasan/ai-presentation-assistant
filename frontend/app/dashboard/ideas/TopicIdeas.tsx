'use client';

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Sparkles, Tag, MessageSquare, Send, X, Bot, Users, TrendingUp, Wallet, BookOpen, Briefcase, Heart, Rocket, LucideIcon, Star } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import client from "../../api/client";
import { useDashboard } from "../DashboardContext";

interface Category {
    icon: LucideIcon;
    en: { label: string; context: string; audience: string; purpose: string };
    tr: { label: string; context: string; audience: string; purpose: string };
}

const CATEGORIES: Category[] = [
    {
        icon: Bot,
        en: { label: 'AI & Technology', context: 'AI & Technology', audience: 'Tech enthusiasts, entrepreneurs', purpose: 'Inform and inspire' },
        tr: { label: 'Yapay Zeka & Teknoloji', context: 'Yapay Zeka ve Teknoloji', audience: 'Teknoloji meraklıları, girişimciler', purpose: 'Bilgilendirmek ve ilham vermek' },
    },
    {
        icon: Users,
        en: { label: 'Leadership', context: 'Leadership & management', audience: 'Managers, team leaders', purpose: 'Motivate and guide' },
        tr: { label: 'Liderlik', context: 'Liderlik ve yönetim', audience: 'Yöneticiler, takım liderleri', purpose: 'Motive etmek ve yol göstermek' },
    },
    {
        icon: TrendingUp,
        en: { label: 'Marketing', context: 'Digital marketing & growth', audience: 'Marketing professionals, startups', purpose: 'Share strategies and inspire' },
        tr: { label: 'Pazarlama', context: 'Dijital pazarlama ve büyüme', audience: 'Pazarlama profesyonelleri, girişimler', purpose: 'Strateji paylaşmak ve ilham vermek' },
    },
    {
        icon: Wallet,
        en: { label: 'Finance', context: 'Personal finance & investment', audience: 'General public, investors', purpose: 'Educate and raise awareness' },
        tr: { label: 'Finans', context: 'Kişisel finans ve yatırım', audience: 'Genel halk, yatırımcılar', purpose: 'Eğitmek ve bilinçlendirmek' },
    },
    {
        icon: BookOpen,
        en: { label: 'Education', context: 'Modern education methods', audience: 'Teachers, educators', purpose: 'Inspire innovation in teaching' },
        tr: { label: 'Eğitim', context: 'Modern eğitim yöntemleri', audience: 'Öğretmenler, eğitimciler', purpose: 'Eğitimde yeniliği teşvik etmek' },
    },
    {
        icon: Briefcase,
        en: { label: 'Career', context: 'Career development & work life', audience: 'Young professionals, graduates', purpose: 'Guide and empower' },
        tr: { label: 'Kariyer', context: 'Kariyer gelişimi ve iş hayatı', audience: 'Genç profesyoneller, mezunlar', purpose: 'Rehberlik etmek ve güçlendirmek' },
    },
    {
        icon: Heart,
        en: { label: 'Health & Wellness', context: 'Healthy living & wellness', audience: 'General public, health enthusiasts', purpose: 'Create awareness' },
        tr: { label: 'Sağlık & Wellness', context: 'Sağlıklı yaşam ve wellness', audience: 'Genel halk, sağlık meraklıları', purpose: 'Farkındalık yaratmak' },
    },
    {
        icon: Rocket,
        en: { label: 'Entrepreneurship', context: 'Entrepreneurship & startup ecosystem', audience: 'Entrepreneurs, investors', purpose: 'Share experience and inspire' },
        tr: { label: 'Girişimcilik', context: 'Girişimcilik ve startup ekosistemi', audience: 'Girişimciler, yatırımcılar', purpose: 'Deneyim paylaşmak ve ilham vermek' },
    },
];

interface TopicIdea {
    title: string;
    description: string;
    angle: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatContext {
    context: string;
    audience: string;
    purpose: string;
}

export default function TopicIdeas() {
    const t = useTranslations('topicIdeas');
    const locale = useLocale();
    const { favoriteTopicIdeas, setFavoriteTopicIdeas, pendingTopicIdea, setPendingTopicIdea } = useDashboard();

    const [context, setContext] = useState('');
    const [audience, setAudience] = useState('');
    const [purpose, setPurpose] = useState('');
    const [ideas, setIdeas] = useState<TopicIdea[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [selectedIdea, setSelectedIdea] = useState<TopicIdea | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [mobileChatOpen, setMobileChatOpen] = useState(false);
    const [chatContext, setChatContext] = useState<ChatContext>({ context: '', audience: '', purpose: '' });
    const [trendingIdeas, setTrendingIdeas] = useState<TopicIdea[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(true);

    const canGenerate = context.trim().length >= 2 && audience.trim().length >= 2 && purpose.trim().length >= 2;

    const generate = async (params?: { context: string; audience: string; purpose: string }) => {
        const ctx = params?.context ?? context.trim();
        const aud = params?.audience ?? audience.trim();
        const pup = params?.purpose ?? purpose.trim();
        if (!ctx || !aud || !pup || loading) return;

        setLoading(true);
        setError(null);

        try {
            const res = await client.post('/api/v1/ideas/topics', {
                context: ctx,
                audience: aud,
                purpose: pup,
                num_ideas: 5,
                language: locale,
            });
            const newIdeas: TopicIdea[] = res.data.ideas || [];
            setIdeas(newIdeas);
            setHasGenerated(true);
        } catch {
            setError(t('errorMessage'));
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = () => generate();

    const handleCategoryClick = (cat: Category) => {
        const data = locale === 'tr' ? cat.tr : cat.en;
        setContext(data.context);
        setAudience(data.audience);
        setPurpose(data.purpose);
        generate(data);
    };

    const handleSelectIdea = (idea: TopicIdea) => {
        setSelectedIdea(idea);
        setChatContext({ context: context.trim(), audience: audience.trim(), purpose: purpose.trim() });
        setChatMessages([{
            role: 'assistant',
            content: `"${idea.title}" — ${t('chatWelcomeBody')}`,
        }]);
        setChatInput('');
        setMobileChatOpen(true);
    };

    const toggleFavorite = (idea: TopicIdea, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavoriteTopicIdeas(prev => {
            const exists = prev.some(f => f.title === idea.title);
            return exists ? prev.filter(f => f.title !== idea.title) : [...prev, idea];
        });
    };

    const isFavorited = (idea: TopicIdea) => favoriteTopicIdeas.some(f => f.title === idea.title);

    useEffect(() => {
        if (!pendingTopicIdea) return;
        setSelectedIdea(pendingTopicIdea);
        setChatContext({ context: context.trim(), audience: audience.trim(), purpose: purpose.trim() });
        setChatMessages([{
            role: 'assistant',
            content: `"${pendingTopicIdea.title}" — ${t('chatWelcomeBody')}`,
        }]);
        setChatInput('');
        setMobileChatOpen(true);
        setPendingTopicIdea(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingTopicIdea]);

    useEffect(() => {
        const defaultParams = locale === 'tr'
            ? {
                context: 'Teknoloji, iş dünyası ve toplumda şu anda öne çıkan konular',
                audience: 'Genel profesyonel kitle',
                purpose: 'İlham vermek ve güncel kalmak',
              }
            : {
                context: 'Currently trending topics in technology, business, and society',
                audience: 'General professional audience',
                purpose: 'Inspire and keep audiences informed',
              };

        client.post('/api/v1/ideas/topics', { ...defaultParams, num_ideas: 5, language: locale })
            .then(res => {
                const fetched: TopicIdea[] = res.data.ideas || [];
                setTrendingIdeas(fetched);
            })
            .catch(() => {})
            .finally(() => setTrendingLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || chatLoading || !selectedIdea) return;

        const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() };
        const updatedMessages = [...chatMessages, userMessage];
        setChatMessages(updatedMessages);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await client.post('/api/v1/ideas/topics/chat', {
                topic: selectedIdea,
                messages: updatedMessages,
                context: chatContext.context,
                audience: chatContext.audience,
                purpose: chatContext.purpose,
                language: locale,
            });
            setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'assistant', content: t('chatError') }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleDesktopClose = () => {
        setSelectedIdea(null);
        setMobileChatOpen(false);
    };

    const handleMobileClose = () => {
        setMobileChatOpen(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className={selectedIdea ? 'flex gap-6 items-start' : ''}>
                {/* Left panel: form + ideas */}
                <div className={`${selectedIdea ? 'flex-1 min-w-0' : ''} space-y-6`}>

                    {/* Form */}
                    <div className="rounded-[1.75rem] border border-white/8 bg-[#0c0c0c] p-6 space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                                label={t('fieldLabel')}
                                placeholder={t('fieldPlaceholder')}
                                value={context}
                                onChange={setContext}
                                maxLength={300}
                            />
                            <FormField
                                label={t('audienceLabel')}
                                placeholder={t('audiencePlaceholder')}
                                value={audience}
                                onChange={setAudience}
                                maxLength={200}
                            />
                            <FormField
                                label={t('purposeLabel')}
                                placeholder={t('purposePlaceholder')}
                                value={purpose}
                                onChange={setPurpose}
                                maxLength={200}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            {error && (
                                <p className="text-xs font-medium text-red-400">{error}</p>
                            )}
                            {!error && <span />}
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={!canGenerate || loading}
                                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={15} className="animate-spin" />
                                        {t('generating')}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={15} />
                                        {hasGenerated ? t('regenerate') : t('generate')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Skeleton loader */}
                    {loading && (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-[1.5rem] border border-white/5 bg-[#0c0c0c] p-5 space-y-3 animate-pulse"
                                >
                                    <div className="h-4 w-2/5 rounded-md bg-white/8" />
                                    <div className="h-3 w-full rounded-md bg-white/5" />
                                    <div className="h-3 w-4/5 rounded-md bg-white/5" />
                                    <div className="h-3 w-1/3 rounded-md bg-primary/10" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Results */}
                    {!loading && ideas.length > 0 && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={ideas[0].title}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4"
                            >
                                <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    {t('resultsLabel', { count: ideas.length })}
                                </p>
                                {ideas.map((idea, i) => (
                                    <IdeaCard
                                        key={i}
                                        idea={idea}
                                        index={i}
                                        t={t}
                                        isSelected={selectedIdea?.title === idea.title}
                                        onSelect={handleSelectIdea}
                                        isFavorited={isFavorited(idea)}
                                        onFavorite={toggleFavorite}
                                    />
                                ))}
                                {!selectedIdea && (
                                    <p className="px-1 text-center text-[11px] text-zinc-600 pt-2">
                                        {t('selectIdeaHint')}
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Category shortcuts — shown before first generation */}
                    {!loading && !hasGenerated && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="space-y-4"
                        >
                            <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                {t('startWithCategory')}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {CATEGORIES.map((cat, i) => {
                                    const data = locale === 'tr' ? cat.tr : cat.en;
                                    const Icon = cat.icon;
                                    return (
                                        <motion.button
                                            key={i}
                                            type="button"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 + i * 0.04 }}
                                            onClick={() => handleCategoryClick(cat)}
                                            className="group flex flex-col items-start gap-3 rounded-2xl border border-white/5 bg-[#0c0c0c] p-4 text-left hover:border-primary/25 hover:bg-primary/[0.04] transition-all active:scale-95"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                                                <Icon size={16} />
                                            </div>
                                            <span className="text-sm font-semibold text-zinc-400 group-hover:text-white transition-colors leading-tight">
                                                {data.label}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Trending ideas — AI generated on page load */}
                    {!loading && !hasGenerated && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="space-y-4"
                        >
                            <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                {t('trendingTopics')}
                            </p>

                            {trendingLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="rounded-[1.5rem] border border-white/5 bg-[#0c0c0c] p-5 space-y-3 animate-pulse"
                                        >
                                            <div className="h-4 w-2/5 rounded-md bg-white/8" />
                                            <div className="h-3 w-full rounded-md bg-white/5" />
                                            <div className="h-3 w-3/5 rounded-md bg-white/5" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                trendingIdeas.map((idea, i) => (
                                    <IdeaCard
                                        key={i}
                                        idea={idea}
                                        index={i}
                                        t={t}
                                        isSelected={selectedIdea?.title === idea.title}
                                        onSelect={handleSelectIdea}
                                        isFavorited={isFavorited(idea)}
                                        onFavorite={toggleFavorite}
                                    />
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* No results after generation */}
                    {!loading && hasGenerated && ideas.length === 0 && (
                        <div className="py-16 text-center text-zinc-600 text-sm">
                            {t('noResults')}
                        </div>
                    )}
                </div>

                {/* Desktop chat panel */}
                {selectedIdea && (
                    <div className="hidden lg:block w-[400px] shrink-0 sticky top-8">
                        <ChatPanel
                            idea={selectedIdea}
                            messages={chatMessages}
                            input={chatInput}
                            loading={chatLoading}
                            onInputChange={setChatInput}
                            onSend={handleSendMessage}
                            onClose={handleDesktopClose}
                            t={t}
                            height="calc(100vh - 6rem)"
                        />
                    </div>
                )}
            </div>

            {/* Mobile: floating chat button */}
            {selectedIdea && !mobileChatOpen && (
                <div className="fixed bottom-6 right-6 z-40 lg:hidden">
                    <button
                        onClick={() => setMobileChatOpen(true)}
                        className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                    >
                        <MessageSquare size={16} />
                        {t('chatOpenBtn')}
                    </button>
                </div>
            )}

            {/* Mobile slide-over */}
            <AnimatePresence>
                {selectedIdea && mobileChatOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black lg:hidden"
                            onClick={handleMobileClose}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm lg:hidden"
                        >
                            <ChatPanel
                                idea={selectedIdea}
                                messages={chatMessages}
                                input={chatInput}
                                loading={chatLoading}
                                onInputChange={setChatInput}
                                onSend={handleSendMessage}
                                onClose={handleMobileClose}
                                t={t}
                                height="100dvh"
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ChatPanel({
    idea,
    messages,
    input,
    loading,
    onInputChange,
    onSend,
    onClose,
    t,
    height,
}: {
    idea: TopicIdea;
    messages: ChatMessage[];
    input: string;
    loading: boolean;
    onInputChange: (v: string) => void;
    onSend: () => void;
    onClose: () => void;
    t: ReturnType<typeof useTranslations>;
    height: string;
}) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div
            className="flex flex-col rounded-[1.75rem] border border-white/8 bg-[#0c0c0c] overflow-hidden"
            style={{ height }}
        >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/5 shrink-0">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">
                        {t('chatTitle')}
                    </p>
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{idea.title}</h3>
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 mt-0.5 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Close"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 invisible-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-sm'
                                    : 'bg-white/[0.05] text-zinc-200 rounded-bl-sm border border-white/5'
                            }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/[0.05] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-4 border-t border-white/5 shrink-0">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chatPlaceholder')}
                        rows={1}
                        className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-primary/50 invisible-scrollbar"
                        style={{ maxHeight: '120px' }}
                    />
                    <button
                        type="button"
                        onClick={onSend}
                        disabled={!input.trim() || loading}
                        className="shrink-0 rounded-xl bg-primary p-2.5 text-white transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Send"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function FormField({
    label,
    placeholder,
    value,
    onChange,
    maxLength,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    maxLength: number;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-primary/50"
            />
        </div>
    );
}

function IdeaCard({
    idea,
    index,
    t,
    isSelected,
    onSelect,
    isFavorited,
    onFavorite,
}: {
    idea: TopicIdea;
    index: number;
    t: ReturnType<typeof useTranslations>;
    isSelected: boolean;
    onSelect: (idea: TopicIdea) => void;
    isFavorited: boolean;
    onFavorite: (idea: TopicIdea, e: React.MouseEvent) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            onClick={() => onSelect(idea)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(idea)}
            className={`group w-full cursor-pointer text-left rounded-[1.5rem] border p-5 transition-all ${
                isSelected
                    ? 'border-primary/40 bg-primary/[0.06]'
                    : 'border-white/5 bg-[#0c0c0c] hover:border-primary/20 hover:bg-white/[0.02]'
            }`}
        >
            <div className="flex items-start gap-4">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black transition-colors ${
                    isSelected
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-white/8 bg-white/[0.03] text-zinc-500 group-hover:border-primary/25 group-hover:text-primary'
                }`}>
                    {isSelected ? <MessageSquare size={14} /> : index + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <h3 className="text-sm font-bold text-white leading-snug">{idea.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{idea.description}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                        <Tag size={10} className="text-primary shrink-0" />
                        <span className="text-[11px] font-semibold text-primary/80">{t('angleLabel')}: </span>
                        <span className="text-[11px] text-zinc-400">{idea.angle}</span>
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => onFavorite(idea, e)}
                        className="rounded-lg p-1 transition-colors"
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Star
                            size={14}
                            className={isFavorited
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-zinc-600 hover:text-amber-400 transition-colors'
                            }
                        />
                    </button>
                    {!isSelected && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1">
                                <MessageSquare size={11} className="text-primary" />
                                <span className="text-[10px] font-bold text-primary">Chat</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
