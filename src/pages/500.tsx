import Link from 'next/link';

export default function Custom500() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Server Error</h2>
        <p className="text-gray-600 mb-6">
          Something went wrong on our end. Please try again later.
        </p>
        <Link href="/">
          <a className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
            Go Home
          </a>
        </Link>
      </div>
    </div>
  );
}
