"use client";

import { useState } from "react";
import { Calendar, Clock, ArrowRight, Search, Tag } from "lucide-react";
import Link from "next/link";
import { BLOG_POSTS, formatDate } from "@/lib/blog-posts";

const CATEGORIES = ["All", "Legal Tech", "Case Studies", "Philippine Law", "AI & Law", "Guides"];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = BLOG_POSTS.filter((post) => {
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = BLOG_POSTS.filter((p) => p.featured);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-primary-950 via-primary-900 to-primary-800 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">JusConsultus Blog</h1>
          <p className="text-lg text-primary-200 max-w-2xl mx-auto">
            Insights on AI-powered legal research, Philippine jurisprudence, and the future of legal
            technology.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Featured Posts */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Featured Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featured.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-linear-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary-600 dark:text-primary-300 opacity-30">
                    JC
                  </span>
                </div>
                <div className="p-6">
                  <span className="inline-block bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium px-2.5 py-1 rounded-full mb-3">
                    {post.category}
                  </span>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(post.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Search and Filters */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  title={`Filter by ${cat}`}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    activeCategory === cat
                      ? "bg-primary-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </section>

        {/* All Posts */}
        <section>
          <h2 className="text-2xl font-bold mb-8">
            {activeCategory === "All" ? "All Articles" : activeCategory}
            <span className="text-muted-foreground text-base font-normal ml-2">
              ({filtered.length})
            </span>
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No articles found.</p>
              <p className="text-sm mt-1">Try a different category or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="h-32 bg-linear-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-400 opacity-20">JC</span>
                  </div>
                  <div className="p-5">
                    <span className="inline-block bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                      {post.category}
                    </span>
                    <h3 className="font-semibold mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.date)}
                      </span>
                      <span className="flex items-center gap-1 text-primary-600 font-medium group-hover:translate-x-0.5 transition-transform">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter CTA */}
        <section className="mt-20 bg-linear-to-r from-primary-600 to-primary-700 rounded-2xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Stay Updated</h2>
          <p className="text-primary-100 mb-6 max-w-lg mx-auto">
            Get the latest insights on Philippine legal tech delivered straight to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2.5 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white outline-none"
            />
            <button className="bg-white text-primary-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-50 transition-colors">
              Subscribe
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
