import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Tag,
  Share2,
  BookOpen,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { BLOG_POSTS, getBlogPost, getRelatedPosts, formatDate } from "@/lib/blog-posts";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} | JusConsultus Blog`,
    description: post.excerpt,
    keywords: post.tags.join(", "),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: ["JusConsultus AI"],
    },
  };
}

function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const results: { id: string; text: string; level: number }[] = [];
  const regex = /<h([23])[^>]*>([^<]+)<\/h[23]>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
    results.push({ id, text, level });
  }
  return results;
}

function addHeadingIds(html: string): string {
  return html.replace(/<h([23])>([^<]+)<\/h([23])>/g, (_, level, text, _close) => {
    const id = (text as string)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
    return `<h${level} id="${id}">${text}</h${level}>`;
  });
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);
  const headings = extractHeadings(post.content);
  const contentWithIds = addHeadingIds(post.content);

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground line-clamp-1 max-w-xs">{post.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-linear-to-br from-primary-950 via-primary-900 to-primary-800 text-white pt-12 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary-200 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="bg-primary-700 text-primary-100 text-xs font-semibold px-3 py-1 rounded-full">
              {post.category}
            </span>
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-white/10 text-primary-200 text-xs px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
            {post.title}
          </h1>
          <p className="text-primary-200 text-lg leading-relaxed mb-8 max-w-3xl">{post.excerpt}</p>

          <div className="flex flex-wrap items-center gap-6 text-sm text-primary-300">
            <span className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                JC
              </div>
              <p className="text-white font-medium">JusConsultus AI</p>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12 xl:gap-16">
          {/* Main Article */}
          <article>
            {/* Article Body */}
            <div
              className="
                prose prose-gray dark:prose-invert max-w-none
                prose-headings:font-bold prose-headings:tracking-tight
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-foreground prose-h2:border-b prose-h2:border-border prose-h2:pb-3
                prose-h3:text-xl prose-h3:mt-7 prose-h3:mb-3 prose-h3:text-foreground
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-5
                prose-ul:my-5 prose-ul:space-y-2
                prose-ol:my-5 prose-ol:space-y-2
                prose-li:text-muted-foreground prose-li:leading-relaxed
                prose-strong:text-foreground prose-strong:font-semibold
                prose-em:text-muted-foreground
                prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:pl-5 prose-blockquote:my-6 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:bg-primary-50 prose-blockquote:dark:bg-primary-950/40 prose-blockquote:py-3 prose-blockquote:rounded-r-lg
                prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
                prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              "
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />

            {/* Share + CTA */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Share this article</p>
                  <div className="flex items-center gap-2">
                    <button
                      title="Copy link"
                      className="flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> Copy link
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full"
                    >
                      <Tag className="w-3 h-3" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Copyright Notice */}
            <div className="mt-8 p-6 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  JC
                </div>
                <div>
                  <p className="font-semibold">JusConsultus AI</p>
                  <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} JusConsultus AI. All rights reserved. This
                    article is an original publication of JusConsultus AI and may not be reproduced
                    without permission.
                  </p>
                </div>
              </div>
            </div>

            {/* Ask JusConsultus CTA */}
            <div className="mt-8 bg-linear-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 rounded-full p-3 shrink-0">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">
                    Have questions about this article?
                  </h3>
                  <p className="text-primary-100 text-sm mb-4">
                    Ask JusConsultus AI for more detailed analysis, related case citations, or help
                    drafting documents on this topic.
                  </p>
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-50 transition-colors text-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    Ask JusConsultus
                  </Link>
                </div>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-8">
              {/* Table of Contents */}
              {headings.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Table of Contents
                  </h3>
                  <nav className="space-y-1">
                    {headings.map((h) => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={`block text-sm transition-colors hover:text-primary-600 ${
                          h.level === 2
                            ? "text-foreground font-medium py-1"
                            : "text-muted-foreground pl-4 py-0.5"
                        }`}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Article Meta */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
                  Article Info
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      JC
                    </div>
                    <p className="font-medium text-foreground">JusConsultus AI</p>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{post.readTime}</span>
                  </div>
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Tag className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-muted text-xs px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ask CTA compact */}
              <div className="rounded-xl bg-primary-600 p-5 text-white">
                <MessageSquare className="w-6 h-6 mb-3" />
                <p className="font-semibold mb-1.5">Ask about this topic</p>
                <p className="text-primary-100 text-xs mb-4">
                  Get AI-powered legal analysis with Philippine case citations.
                </p>
                <Link
                  href="/chat"
                  className="block text-center bg-white text-primary-700 font-semibold text-sm py-2 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Open JusConsultus
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((relPost) => (
                <Link
                  key={relPost.id}
                  href={`/blog/${relPost.id}`}
                  className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="h-28 bg-linear-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-400 opacity-20">JC</span>
                  </div>
                  <div className="p-5">
                    <span className="inline-block bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                      {relPost.category}
                    </span>
                    <h3 className="font-semibold text-sm mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {relPost.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(relPost.date)}
                      </span>
                      <span className="flex items-center gap-1 text-primary-600 font-medium">
                        Read <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all articles
          </Link>
        </div>
      </div>
    </div>
  );
}
