export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
      {/* Right: Promo Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-lg">
          <img src="/logo.png" alt="JusConsultus AI" className="w-16 h-16 mb-8 rounded-xl" />
          <h2 className="text-3xl font-bold mb-4">JusConsultus AI</h2>
          <p className="text-lg text-primary-200 mb-8">
            Your AI-powered legal research companion for the Philippine Justice System.
          </p>
          <div className="space-y-4">
            {[
              "AI-powered case law research",
              "Comprehensive Philippine legal database",
              "Intelligent document drafting",
              "RAG-enhanced legal analysis",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-primary-100">{feature}</span>
              </div>
            ))}
          </div>

          {/* Mock Chat Preview */}
          <div className="mt-10 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">ME</div>
              <div className="bg-white/10 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm">
                What are the requirements for double jeopardy to arise in criminal cases?
              </div>
            </div>
            <div className="flex items-start gap-3">
              <img src="/logo.png" alt="" className="w-8 h-8 rounded-full" />
              <div className="bg-white/10 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-primary-100">
                Hey! To determine this, let&apos;s analyze the information provided in the Philippine Jurisprudence...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
