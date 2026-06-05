import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">That tool or page does not exist.</p>
      <Link
        to="/"
        className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        Back to all tools
      </Link>
    </div>
  );
}
