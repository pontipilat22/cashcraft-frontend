'use client';

import Chart from './chart';

export default function ChartPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Chart />
      </div>
    </div>
  );
}
