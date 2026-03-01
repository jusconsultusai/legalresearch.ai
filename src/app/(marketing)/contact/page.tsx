import Link from "next/link";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { Mail, Phone, MapPin, ArrowRight, MessageSquare, Clock } from "lucide-react";

export const metadata = {
  title: "Contact Us | JusConsultus AI",
  description: "Get in touch with the JusConsultus AI team. We're here to help with your legal research needs.",
};

export default async function ContactPage() {
  const user = await getCurrentUser();

  return (
    <div className="py-12 sm:py-20">
      <div className="max-w-4xl mx-auto px-4 space-y-10 sm:space-y-16">

        {/* Hero */}
        <div className="text-center">
          <Badge variant="accent" className="mb-4">Contact Us</Badge>
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Get in <span className="text-primary-600">Touch</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Have questions about JusConsultus AI? We&apos;d love to hear from you. Reach out through any of the channels below and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Email */}
          <a
            href="mailto:jusconsultus.ai@gmail.com"
            className="group p-6 rounded-2xl border border-border hover:border-primary-300 hover:shadow-md transition-all bg-surface"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-bold text-lg mb-1">Email Us</h3>
            <p className="text-sm text-text-secondary mb-3">Send us a message anytime.</p>
            <p className="text-sm font-medium text-primary-600 break-all">
              jusconsultus.ai@gmail.com
            </p>
          </a>

          {/* Phone */}
          <a
            href="tel:+639757477099"
            className="group p-6 rounded-2xl border border-border hover:border-primary-300 hover:shadow-md transition-all bg-surface"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-700/20 flex items-center justify-center mb-4 group-hover:bg-accent-100 dark:group-hover:bg-accent-700/30 transition-colors">
              <Phone className="w-6 h-6 text-accent-600" />
            </div>
            <h3 className="font-bold text-lg mb-1">Call Us</h3>
            <p className="text-sm text-text-secondary mb-3">Mon–Fri, 9 AM – 6 PM PHT</p>
            <p className="text-sm font-medium text-accent-600">0975 747 7099</p>
          </a>

          {/* Address */}
          <div className="group p-6 rounded-2xl border border-border hover:border-primary-300 hover:shadow-md transition-all bg-surface">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-bold text-lg mb-1">Visit Us</h3>
            <p className="text-sm text-text-secondary mb-3">Our office location.</p>
            <p className="text-sm font-medium text-text-primary leading-relaxed">
              Pengue, Tuguegarao City<br />Cagayan, Philippines
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Support Hours */}
          <div className="p-6 rounded-2xl border border-border bg-surface-secondary">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-bold text-lg">Support Hours</h3>
            </div>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex justify-between">
                <span>Monday – Friday</span>
                <span className="font-medium text-text-primary">9:00 AM – 6:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Saturday</span>
                <span className="font-medium text-text-primary">9:00 AM – 12:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday</span>
                <span className="font-medium text-text-primary">Closed</span>
              </li>
              <li className="pt-2 text-xs text-text-tertiary">
                All times are in Philippine Standard Time (PHT, UTC+8)
              </li>
            </ul>
          </div>

          {/* Quick Support */}
          <div className="p-6 rounded-2xl border border-border bg-surface-secondary">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-700/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent-600" />
              </div>
              <h3 className="font-bold text-lg">Quick Support</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              For faster responses, check our Help Center first — most common questions are answered there.
            </p>
            <div className="space-y-2">
              <Link
                href="/help"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-border hover:border-primary-300 hover:bg-surface transition-all text-sm font-medium"
              >
                Visit Help Center <ArrowRight className="w-4 h-4 text-text-tertiary" />
              </Link>
              <Link
                href="/chat"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-border hover:border-primary-300 hover:bg-surface transition-all text-sm font-medium"
              >
                Ask AI Assistant <ArrowRight className="w-4 h-4 text-text-tertiary" />
              </Link>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">Follow Us</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/jusconsultus.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border hover:border-[#1877F2] hover:shadow-md transition-all bg-surface"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1877F2]/10 flex items-center justify-center group-hover:bg-[#1877F2]/20 transition-colors">
                <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Facebook</p>
                <p className="text-xs text-text-tertiary mt-0.5">@jusconsultus.online</p>
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/jusconsultus"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border hover:border-[#E1306C] hover:shadow-md transition-all bg-surface"
            >
              <div className="w-12 h-12 rounded-xl bg-[#E1306C]/10 flex items-center justify-center group-hover:bg-[#E1306C]/20 transition-colors">
                <svg className="w-6 h-6 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Instagram</p>
                <p className="text-xs text-text-tertiary mt-0.5">@jusconsultus</p>
              </div>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@jusconsultus"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border hover:border-[#010101] hover:shadow-md transition-all bg-surface"
            >
              <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                <svg className="w-6 h-6 text-[#010101] dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">TikTok</p>
                <p className="text-xs text-text-tertiary mt-0.5">@jusconsultus</p>
              </div>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/@jusconsultus"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border hover:border-[#FF0000] hover:shadow-md transition-all bg-surface"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FF0000]/10 flex items-center justify-center group-hover:bg-[#FF0000]/20 transition-colors">
                <svg className="w-6 h-6 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">YouTube</p>
                <p className="text-xs text-text-tertiary mt-0.5">@jusconsultus</p>
              </div>
            </a>
          </div>
        </div>

        {/* Map embed placeholder */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <iframe
            title="JusConsultus AI Location"
            src="https://maps.google.com/maps?q=Pengue,+Tuguegarao+City,+Cagayan,+Philippines&z=14&output=embed"
            width="100%"
            height="320"
            className="border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-700/20 rounded-2xl p-6 sm:p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-text-secondary mb-6">
            Try JusConsultus AI free — no credit card required.
          </p>
          {user ? (
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              Go to App <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}
