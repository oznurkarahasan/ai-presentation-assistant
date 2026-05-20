'use client';

import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowRight, Search } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function BlogPage() {
    const t = useTranslations("blog");

    const BLOG_POSTS = [
        {
            id: 1,
            title: t("posts.1.title"),
            excerpt: t("posts.1.excerpt"),
            category: t("categories.tutorial"),
            author: t("posts.1.author"),
            date: t("posts.1.date"),
            readTime: t("posts.1.readTime"),
            image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800",
            featured: true
        },
        {
            id: 2,
            title: t("posts.2.title"),
            excerpt: t("posts.2.excerpt"),
            category: t("categories.psychology"),
            author: t("posts.2.author"),
            date: t("posts.2.date"),
            readTime: t("posts.2.readTime"),
            image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800",
            featured: false
        },
        {
            id: 3,
            title: t("posts.3.title"),
            excerpt: t("posts.3.excerpt"),
            category: t("categories.product"),
            author: t("posts.3.author"),
            date: t("posts.3.date"),
            readTime: t("posts.3.readTime"),
            image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
            featured: false
        },
        {
            id: 4,
            title: t("posts.4.title"),
            excerpt: t("posts.4.excerpt"),
            category: t("categories.tips"),
            author: t("posts.4.author"),
            date: t("posts.4.date"),
            readTime: t("posts.4.readTime"),
            image: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&q=80&w=800",
            featured: false
        }
    ];

    const featuredPost = BLOG_POSTS.find(p => p.featured);
    const recentPosts = BLOG_POSTS.filter(p => !p.featured);
    const allCategoryLabel = t("categories.all");

    return (
        <div className="flex flex-col min-h-screen bg-black relative selection:bg-primary/30">
            <div className="bg-grid" />
            <Navbar />

            <main className="flex-1 pt-44 pb-20 px-6 relative z-10">
                <div className="container mx-auto max-w-7xl">
                    {/* Hero */}
                    <div className="text-center mb-16 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">{t("title")}</h1>
                            <p className="text-secondary-text max-w-2xl mx-auto text-lg pt-4">
                                {t("subtitle")}
                            </p>
                        </motion.div>
                    </div>

                    {/* Featured Post */}
                    {featuredPost && (
                        <motion.section
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            className="mb-20"
                        >
                            <Link href={`/blog/${featuredPost.id}`} className="group block">
                                <div className="glass-card overflow-hidden rounded-[3rem] border-white/10 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-500 flex flex-col lg:flex-row items-stretch">
                                    <div className="lg:w-1/2 relative min-h-[300px] sm:min-h-[400px]">
                                        <Image
                                            src={featuredPost.image}
                                            alt={featuredPost.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent lg:hidden" />
                                    </div>
                                    <div className="lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center space-y-6">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary uppercase tracking-widest">
                                                {t("featured")}
                                            </span>
                                            <span className="text-zinc-500 text-sm">{featuredPost.category}</span>
                                        </div>
                                        <h2 className="text-3xl sm:text-4xl font-bold text-white group-hover:text-primary transition-colors leading-tight">
                                            {featuredPost.title}
                                        </h2>
                                        <p className="text-zinc-400 text-lg leading-relaxed">
                                            {featuredPost.excerpt}
                                        </p>
                                        <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <User size={16} className="text-primary" />
                                                <span className="text-sm">{featuredPost.author}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <Calendar size={16} />
                                                <span className="text-sm">{featuredPost.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.section>
                    )}

                    {/* Filters/Search */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-8 mb-12">
                        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto items-center no-scrollbar">
                            {[
                                allCategoryLabel,
                                t("categories.tutorial"),
                                t("categories.psychology"),
                                t("categories.product"),
                                t("categories.tips")
                            ].map((cat) => (
                                <button
                                    key={cat}
                                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex-shrink-0 ${cat === allCategoryLabel
                                        ? "bg-white text-black"
                                        : "bg-white/5 text-zinc-400 border border-white/5 hover:border-white/20 hover:text-white"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder={t("searchPlaceholder")}
                                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Blog Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {recentPosts.map((post, idx) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <BlogCard post={post} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

interface BlogPost {
    id: number;
    title: string;
    excerpt: string;
    category: string;
    author: string;
    date: string;
    readTime: string;
    image: string;
    featured: boolean;
}

function BlogCard({ post }: { post: BlogPost }) {
    const t = useTranslations("blog");
    return (
        <Link href={`/blog/${post.id}`} className="group block h-full">
            <div className="glass-card h-full rounded-[2rem] border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 hover:border-primary/20 transition-all duration-300 overflow-hidden flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                            {post.category}
                        </span>
                    </div>
                </div>
                <div className="p-8 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors mb-4 line-clamp-2">
                        {post.title}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                        {post.excerpt}
                    </p>
                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-primary" />
                            <span className="text-zinc-500 text-xs font-medium">{post.readTime}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-bold text-xs uppercase tracking-widest group-hover:gap-2 transition-all">
                            {t("readMore")}
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
