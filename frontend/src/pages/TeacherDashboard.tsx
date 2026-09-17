import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/analytics.api';
import { Card } from '../components/ui/Card';
import { Users, AlertCircle } from 'lucide-react';
import type { ClassroomTopicStat } from '../types';

// Hardcoded for UI demo. In reality, you'd fetch teacher's courses first.
const SAMPLE_COURSE_ID = "123e4567-e89b-12d3-a456-426614174000"; 

export const TeacherDashboard = () => {
  const [stats, setStats] = useState<ClassroomTopicStat[]>([]);

  useEffect(() => {
    // Wrap in try/catch because the sample ID might not exist in your DB
    analyticsApi.getClassroomOverview(SAMPLE_COURSE_ID).catch(() => {
      // Fallback to mock data for UI demonstration if API fails
      setStats([
        { topicId: '1', topicName: 'Fractions', totalStudents: 30, strugglingStudents: 12, strugglingPct: 40, avgMastery: 0.55 },
        { topicId: '2', topicName: 'Algebra Basics', totalStudents: 30, strugglingStudents: 5, strugglingPct: 16, avgMastery: 0.82 },
        { topicId: '3', topicName: 'Geometry', totalStudents: 30, strugglingStudents: 22, strugglingPct: 73, avgMastery: 0.35 },
      ]);
    }).then((data) => {
      if(data) setStats(data);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Classroom Overview</h1>
      <p className="text-gray-600 mb-6">Real-time learning gaps detected before examinations.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const isCritical = stat.strugglingPct > 50;
          return (
            <Card key={stat.topicId} className={isCritical ? 'border-red-200 bg-red-50' : ''}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{stat.topicName}</h3>
                {isCritical && <AlertCircle className="w-5 h-5 text-red-500" />}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Users className="w-4 h-4" />
                <span>{stat.totalStudents} Students Enrolled</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Class Average Mastery</span>
                  <span className="font-bold">{Math.round(stat.avgMastery * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${stat.avgMastery * 100}%` }}></div>
                </div>
              </div>

              <div className={`mt-4 p-3 rounded-md ${isCritical ? 'bg-red-100' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium ${isCritical ? 'text-red-700' : 'text-gray-700'}`}>
                  {stat.strugglingStudents} students ({Math.round(stat.strugglingPct)}%) are currently struggling.
                </p>
              </div>
              
              <button className={`w-full mt-4 py-2 px-4 rounded-md text-sm font-medium transition-colors ${isCritical ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                {isCritical ? 'Intervene Now' : 'View Details'}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};