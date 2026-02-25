import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <img src="/logo.png" alt="JusConsultus AI" className="w-16 h-16 mx-auto rounded-xl" />
        </div>
        <h1 className="text-7xl font-bold text-primary-600 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you are looking for does not exist or may have been moved. Like an unreported
          case, it cannot be found in the records.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
          >
            Ask JusConsultus
          </Link>
        </div>
      </div>
    </div>
  );
}
