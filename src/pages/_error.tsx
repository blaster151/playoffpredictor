import { NextPageContext } from 'next';
import Head from 'next/head';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <>
      <Head>
        <title>Error - NFL Playoff Predictor</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">🏈</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {statusCode ? `Error ${statusCode}` : 'Something went wrong'}
          </h1>
          <p className="text-gray-600 mb-6">
            {statusCode
              ? `An error ${statusCode} occurred on server`
              : 'An error occurred on client'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
