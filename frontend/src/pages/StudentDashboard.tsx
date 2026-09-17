import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/analytics.api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { GapReport } from '../types';

export const StudentDashboard = () => {
  const [gaps, setGaps] = useState<GapReport[]>([]);

  useEffect(() => {
    analyticsApi.getMyGaps().then(setGaps).catch(console.error);
  }, []);

  const criticalGaps = gaps.filter(g => g.severity === 'CRITICAL' || g.severity === 'HIGH');

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Learning Dashboard</h1>

      {/* Early Warning System Banner */}
      {criticalGaps.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Early Intervention Alert</h3>
            <p className="text-sm text-red-700">You have critical knowledge gaps in {criticalGaps.length} topics. Please review the recommendations below before the next exam.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gaps.length === 0 ? (
          <Card><p className="text-gray-500">No active learning gaps detected. Great job!</p></Card>
        ) : (
          gaps.map((gap) => (
            <Card key={gap.topicId}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{gap.topicName}</h3>
                  <p className="text-sm text-gray-500">{gap.courseName}</p>
                </div>
                <Badge severity={gap.severity} />
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Mastery Level</span>
                  <span className="font-bold text-gray-900">{Math.round(gap.masteryProb * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${gap.masteryProb * 100}%` }}></div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                Attempts: {gap.attempts} | Correct: {gap.correctAttempts}
              </div>

              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md text-sm font-medium transition-colors">
                View AI Study Recommendations
              </button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};