import { Link } from 'react-router-dom';
import { Search, Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-neutral-400" />
        </div>

        <h1 className="text-display-md font-bold text-neutral-900">404</h1>
        <h2 className="text-heading-lg font-semibold text-neutral-900 mt-2">Page Not Found</h2>
        <p className="text-body-md text-neutral-500 mt-3 max-w-sm mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary btn-md"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
          <Link to="/" className="btn-primary btn-md">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-200">
          <p className="text-body-sm text-neutral-500 mb-3">Or search for what you need:</p>
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="search"
              placeholder="Search..."
              className="input pl-10"
              aria-label="Search"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}