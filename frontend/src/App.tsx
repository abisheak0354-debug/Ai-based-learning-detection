import { ChangeEvent, FormEvent, useState } from 'react';
import {
  Bell,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet,
  Home,
  Inbox,
  LineChart,
  Menu,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Play,
  Plus,
  Send,
  Settings,
  Sparkles,
  Star,
  Target,
  UploadCloud,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { apiClient } from './api/client';

type Subject = { subject: string; accuracy: number; predictedScore?: number; predictionConfidence?: number; weakness: number; status: 'critical' | 'watch' | 'strong'; recommendation: string };
type StudentProfile = { studentId: string; studentName: string; subjects: Subject[]; weakestSubject: string; strongestSubject: string; averageAccuracy: number; predictionAccuracy?: { score: number; samples: number; metric: string } };
type Analysis = { fileName: string; rows: number; weakestSubject: string; modelAccuracy: number | null; subjects: Subject[]; profiles: StudentProfile[]; training?: { samples?: number; validation_accuracy?: number | null; metric?: string } };

const mapProfile = (profile: any): StudentProfile => {
  const subjects = (profile.subjects ?? []).map((subject: any) => ({
    subject: subject.subject,
    accuracy: Number(subject.accuracy ?? subject.percentage ?? subject.score ?? 0),
    predictedScore: subject.predictedScore ?? subject.prediction?.next_score,
    predictionConfidence: subject.predictionConfidence ?? subject.prediction?.confidence,
    weakness: Number(subject.weakness ?? Math.max(0, 100 - Number(subject.percentage ?? subject.score ?? 0))),
    status: ['Excellent', 'Good'].includes(String(subject.status)) ? 'strong' : ['Needs Improvement', 'Learning Gap'].includes(String(subject.status)) ? 'critical' : 'watch',
    recommendation: subject.recommendation ?? (['Needs Improvement', 'Learning Gap'].includes(String(subject.status)) ? `Prioritize ${subject.subject} because the uploaded score is below the configured threshold.` : `Maintain ${subject.subject} performance based on the uploaded score.`),
  }));
  return { ...profile, studentId: profile.studentId ?? profile.student_id, studentName: profile.studentName ?? profile.student_name, subjects, predictionAccuracy: profile.predictionAccuracy ?? profile.prediction_accuracy, weakestSubject: profile.weakestSubject ?? profile.weakest_subject ?? subjects[subjects.length - 1]?.subject ?? 'No subject detected', strongestSubject: profile.strongestSubject ?? profile.strongest_subject ?? subjects[0]?.subject ?? 'No subject detected' };
};

function App() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [training, setTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi! Ask me which subject needs your attention or upload your latest assessment data.' }]);

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await apiClient.post<{ data: Analysis }>('/datasets/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAnalysis(data.data);
      const mappedProfiles = (data.data.profiles ?? []).map(mapProfile);
      setProfiles(mappedProfiles);
      const firstProfile = mappedProfiles[0];
      setSelectedStudentId(firstProfile?.studentId ?? '');
      setSubjects(firstProfile?.subjects ?? []);
    } catch (error: any) {
      const detail = error?.response?.data?.detail ?? error?.response?.data?.message;
      setUploadError(detail ? `Upload failed: ${detail}` : 'This dataset could not be analyzed. Include an ID/name column and numeric subject score columns.');
    } finally {
      setUploading(false);
    }
  };

  const loadDemoDataset = async () => {
    setUploading(true);
    setUploadError('');
    try {
      const { data } = await apiClient.post<{ data: Analysis }>('/demo/generate/1000');
      setAnalysis(data.data);
      setFileName(data.data.fileName);
      const mappedProfiles = (data.data.profiles ?? []).map(mapProfile);
      setProfiles(mappedProfiles);
      const firstProfile = mappedProfiles[0];
      setSelectedStudentId(firstProfile?.studentId ?? '');
      setSubjects(firstProfile?.subjects ?? []);
      setTrainingMessage(`Loaded 1,000 students. Validation accuracy: ${((data.data.training?.validation_accuracy ?? 0) * 100).toFixed(1)}%.`);
    } catch {
      setUploadError('The 1,000-student demo dataset could not be generated.');
    } finally {
      setUploading(false);
    }
  };

  const selectStudent = (studentId: string) => {
    const profile = profiles.find((candidate) => candidate.studentId === studentId);
    if (!profile) return;
    setSelectedStudentId(studentId);
    setSubjects(profile.subjects);
  };

  const askAi = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: 'user', text }]);
    setChatInput('');
    try {
      const selectedProfile = profiles.find((profile) => profile.studentId === selectedStudentId);
      const { data } = await apiClient.post('/ai/chat', { message: text, mode: 'predict', student_id: selectedProfile?.studentId });
      setMessages((current) => [...current, { role: 'assistant', text: data.data.message }]);
    } catch (error: any) {
      const detail = error?.response?.data?.detail ?? error?.response?.data?.message;
      const fallback = selectedStudentId
        ? 'The local subject insights are ready, but the AI service is unavailable.'
        : 'Select a student from the dataset first, then ask your question.';
      setMessages((current) => [...current, { role: 'assistant', text: detail ? String(detail) : fallback }]);
    }
  };

  const trainModel = async () => {
    if (training) return;
    setTraining(true);
    setTrainingMessage('Training subject model...');
    try {
      const { data } = await apiClient.post('/ai/chat', {
        message: 'Train the subject-level performance model using the uploaded learner context.',
        mode: 'train',
        student_id: selectedStudentId,
      });
      const validationAccuracy = data.data.training?.validation_accuracy;
      setTrainingMessage(validationAccuracy !== undefined && validationAccuracy !== null ? `Model trained at ${(validationAccuracy * 100).toFixed(1)}% validation accuracy.` : 'Forecasts are ready. Add at least 10 scored records for a reliable validation accuracy.');
      setMessages((current) => [...current, { role: 'assistant', text: data.data.message }]);
    } catch {
      setTrainingMessage('Training could not complete. The current local insights are still available.');
    } finally {
      setTraining(false);
    }
  };

  const selectedProfile = profiles.find((profile) => profile.studentId === selectedStudentId);
  const hasPrediction = subjects.length > 0;
  const weakest = selectedProfile?.weakestSubject ?? analysis?.weakestSubject ?? 'Upload a dataset';
  const validationAccuracy = analysis?.training?.validation_accuracy;
  const modelAccuracy = selectedProfile?.predictionAccuracy?.score ?? (validationAccuracy !== undefined && validationAccuracy !== null ? validationAccuracy * 100 : analysis?.modelAccuracy ?? null);
  const weakSubjects = subjects.filter((subject) => subject.status !== 'strong');
  const strongSubjects = subjects.filter((subject) => subject.status === 'strong');
  const displayName = selectedProfile?.studentName ?? 'Teacher dashboard';

  return (
    <div className="min-h-screen bg-[#eef0fb] text-[#4c4b61]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-5 p-5 lg:p-7">
        <aside className="hidden w-[230px] shrink-0 flex-col justify-between rounded-[28px] bg-white p-4 shadow-[0_18px_50px_rgba(111,93,190,0.08)] lg:flex">
          <div>
            <div className="flex items-center gap-3 px-3 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a462ee] to-[#6741d9] text-white shadow-lg shadow-[#8b5de8]/30"><BrainCircuit className="h-5 w-5" /></div><div><p className="font-black tracking-tight text-[#5d4bc5]">LearnPredict</p><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#aaa9bd]">AI learning studio</p></div></div>
            <button type="button" className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-[#7c4de0] px-4 py-3 text-left text-sm font-bold text-white shadow-lg shadow-[#7c4de0]/25"><Plus className="h-4 w-4" /> New analysis</button>
            <nav className="mt-8 space-y-2" aria-label="Dashboard navigation"><SideItem icon={<Home />} label="Overview" active /><SideItem icon={<BookOpen />} label="My subjects" /><SideItem icon={<UploadCloud />} label="Data studio" /><SideItem icon={<LineChart />} label="Model accuracy" /><SideItem icon={<Users />} label="Learner groups" /></nav>
          </div>
          <div className="space-y-2"><SideItem icon={<HelpCircle />} label="Help center" /><SideItem icon={<Settings />} label="Settings" /><div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f5f3fd] p-3"><Avatar /><div className="min-w-0"><p className="truncate text-xs font-bold text-[#555369]">{displayName}</p><p className="text-[10px] text-[#aaa9bd]">{selectedProfile ? selectedProfile.studentId : 'Upload a dataset'}</p></div><MoreVertical className="ml-auto h-4 w-4 text-[#aaa9bd]" /></div></div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-5 flex items-center justify-between"><div className="flex items-center gap-3 lg:hidden"><button type="button" className="rounded-xl bg-white p-3 text-[#6f4bd6] shadow-sm"><Menu className="h-5 w-5" /></button><span className="font-black text-[#5d4bc5]">LearnPredict</span></div><div className="hidden md:block"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#aaa9bd]">Data-driven student analysis</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#514f66]">{selectedProfile ? `${displayName}'s performance` : 'Teacher dashboard'} <span className="text-[#895ce2]">✦</span></h1></div><div className="flex items-center gap-3"><button type="button" className="relative rounded-full bg-white p-3 text-[#8f8ca4] shadow-sm" aria-label="Notifications"><Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ed719b]" /></button><div className="hidden items-center gap-2 rounded-full bg-white py-1.5 pl-2 pr-4 shadow-sm sm:flex"><Avatar /><span className="text-xs font-bold text-[#69677c]">{displayName}</span><ChevronRight className="h-3.5 w-3.5 text-[#aaa9bd]" /></div></div></header>

          <section className="grid gap-5 xl:grid-cols-[1.42fr_0.78fr]">
            <div className="rounded-[28px] bg-gradient-to-br from-[#7546db] via-[#8959e5] to-[#a566ed] p-7 text-white shadow-xl shadow-[#8460dc]/20 sm:p-9"><div className="flex items-start justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"><Sparkles className="h-3.5 w-3.5" />Dataset prediction</span><h2 className="mt-7 max-w-lg text-3xl font-black leading-tight sm:text-4xl">{hasPrediction ? <>Your next breakthrough starts with <span className="text-[#f4dc70]">{weakest}.</span></> : 'Upload student data to generate a prediction.'}</h2><p className="mt-4 max-w-md text-sm leading-6 text-white/75">{hasPrediction ? `This result is calculated from ${selectedProfile?.studentName ?? 'the selected student'}'s uploaded subject records.` : 'Load 1,000 demo students or add a CSV/Excel file to calculate individual weak and strong subjects.'}</p></div><Zap className="h-7 w-7 text-[#f4dc70]" /></div><div className="mt-9 flex flex-wrap gap-3"><button type="button" onClick={() => setChatOpen(true)} disabled={!hasPrediction} className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#7044d2] transition hover:bg-[#f4dc70] disabled:cursor-not-allowed disabled:opacity-50">Ask about selected student</button><button type="button" onClick={() => void loadDemoDataset()} disabled={uploading} className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-50">{uploading ? 'Loading...' : 'Load 1,000 demo students'}</button><label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"><input type="file" accept=".csv,.xlsx,.xls" onChange={uploadFile} className="hidden" />Upload dataset <UploadCloud className="h-4 w-4" /></label></div></div>
            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(111,93,190,0.08)]"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#aaa9bd]">Prediction accuracy</p><p className="mt-2 text-4xl font-black text-[#5b50c9]">{hasPrediction && modelAccuracy !== null ? `${modelAccuracy.toFixed(1)}%` : '--'}</p><p className="mt-1 text-xs text-[#aaa9bd]">{selectedProfile?.predictionAccuracy ? `${selectedProfile.studentName}'s ${selectedProfile.predictionAccuracy.samples} held-out assessments` : hasPrediction && modelAccuracy !== null ? 'dataset validation' : 'needs repeated scored assessments'}</p></div><div className="rounded-2xl bg-[#f1edff] p-3 text-[#8c5ce5]"><Target className="h-5 w-5" /></div></div><div className="mt-8 flex h-24 items-end gap-2">{(hasPrediction ? [28, 39, 34, 52, 47, 66, 60, 82, 72, 88, 76, Math.max(15, modelAccuracy ?? 15)] : [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]).map((height, index) => <div key={index} className={`flex-1 rounded-t-full ${hasPrediction && index === 11 ? 'bg-[#8f5ce5]' : 'bg-[#dfd4fb]'}`} style={{ height: `${height}%` }} />)}</div><div className="mt-3 flex justify-between text-[10px] text-[#aaa9bd]"><span>Input</span><span>Subjects</span><span>Prediction</span></div><div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#5fbe9f]"><span className="rounded-full bg-[#e8faf3] px-2 py-1">{hasPrediction ? `${subjects.length} subjects` : 'Waiting'}</span>{hasPrediction ? 'analyzed for selected student' : 'upload data to begin'}</div></div>
          </section>

          {profiles.length > 0 && <section className="mt-5 flex flex-col gap-3 rounded-[24px] bg-white p-4 shadow-[0_18px_50px_rgba(111,93,190,0.08)] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#aaa9bd]">Dataset student selector</p><p className="mt-1 text-sm text-[#77758a]">Ask AI about the selected student only.</p></div><select value={selectedStudentId} onChange={(event) => selectStudent(event.target.value)} className="rounded-xl bg-[#f4f1ff] px-4 py-3 text-sm font-bold text-[#6f4bd6] outline-none"><option value="">Select student</option>{profiles.map((profile) => <option key={profile.studentId} value={profile.studentId}>{profile.studentName} ({profile.studentId})</option>)}</select></section>}

          {uploadError && <div className="mt-5 rounded-2xl border border-[#f1b9c8] bg-[#fff1f5] px-4 py-3 text-sm font-bold text-[#c45b82]">{uploadError}</div>}

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_0.78fr]">
            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(111,93,190,0.08)]"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#aaa9bd]">Subject performance</p><h2 className="mt-1 text-xl font-black text-[#555369]">{hasPrediction ? 'Where to focus next' : 'Waiting for uploaded data'}</h2></div><button type="button" className="rounded-full bg-[#f4f1ff] px-3 py-2 text-xs font-bold text-[#7953d6]">{hasPrediction ? 'View all' : 'Upload first'}</button></div><div className="mt-6 space-y-3">{hasPrediction ? subjects.map((subject) => <SubjectRow key={subject.subject} subject={subject} />) : <div className="rounded-2xl bg-[#faf9ff] p-5 text-sm leading-6 text-[#aaa9bd]">Your individual subject prediction will appear here after you upload the student CSV or Excel file.</div>}</div><div className="mt-5 flex items-center justify-between rounded-2xl bg-[#faf9ff] p-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#eee9ff] p-2 text-[#8057dc]"><FileSpreadsheet className="h-4 w-4" /></div><div><p className="text-xs font-bold text-[#646176]">{fileName || 'No dataset selected'}</p><p className="text-[10px] text-[#aaa9bd]">{analysis ? `${analysis.rows} records analyzed` : 'Upload a CSV or spreadsheet to train'}</p></div></div><label className="cursor-pointer rounded-full bg-[#7951db] px-3 py-2 text-[10px] font-bold text-white"><input type="file" accept=".csv,.xlsx,.xls" onChange={uploadFile} className="hidden" />Upload</label></div></div>
            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(111,93,190,0.08)]"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#aaa9bd]">Evidence-based plan</p><h2 className="mt-1 text-xl font-black text-[#555369]">Next actions</h2></div><CalendarDays className="h-5 w-5 text-[#8b5ce1]" /></div><div className="mt-6 rounded-2xl bg-[#f6f2ff] p-4"><p className="text-[10px] font-bold uppercase text-[#aaa9bd]">Selected student</p><p className="mt-1 text-lg font-black text-[#5c5272]">{selectedProfile?.studentName ?? 'No student selected'}</p></div><div className="mt-5 space-y-3"><PlanItem color="bg-[#8c5ce1]" time="01" title={hasPrediction ? weakest : 'Upload data'} detail={hasPrediction ? 'Highest-priority subject from uploaded scores' : 'Select a CSV or Excel dataset'} /><PlanItem color="bg-[#f0b6ca]" time="02" title={hasPrediction ? `${subjects.length} subjects analyzed` : 'No subject records'} detail={hasPrediction ? 'Review the subject performance panel' : 'No prediction is generated yet'} /><PlanItem color="bg-[#9bdcc8]" time="03" title="AI analysis" detail={hasPrediction ? 'Ask the assistant about this student' : 'Available after a dataset upload'} /></div></div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[28px] bg-[#fff3f7] p-6 shadow-[0_18px_50px_rgba(111,93,190,0.06)]">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#c47d9a]">Individual attention</p><h2 className="mt-1 text-xl font-black text-[#665267]">Weak areas</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#d56d94]">{weakSubjects.length} subjects</span></div>
              <div className="mt-5 space-y-3">{weakSubjects.map((subject) => <div key={subject.subject} className="flex items-center gap-3 rounded-2xl bg-white/75 p-3"><div className="h-2.5 w-2.5 rounded-full bg-[#ed7da4]" /><div className="min-w-0 flex-1"><p className="text-xs font-black text-[#655568]">{subject.subject}</p><p className="mt-1 text-[10px] text-[#aa8a9a]">{subject.recommendation}</p></div><span className="text-sm font-black text-[#d56d94]">{subject.accuracy}%</span></div>)}{weakSubjects.length === 0 && <p className="rounded-2xl bg-white/75 p-4 text-sm text-[#aa8a9a]">No weak subjects detected in this dataset.</p>}</div>
            </div>
            <div className="rounded-[28px] bg-[#effbf7] p-6 shadow-[0_18px_50px_rgba(111,93,190,0.06)]">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#6da88f]">Individual strengths</p><h2 className="mt-1 text-xl font-black text-[#4f665d]">Strong areas</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#55ae91]">{strongSubjects.length} subjects</span></div>
              <div className="mt-5 space-y-3">{strongSubjects.map((subject) => <div key={subject.subject} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3"><div className="h-2.5 w-2.5 rounded-full bg-[#7ed5b7]" /><div className="min-w-0 flex-1"><p className="text-xs font-black text-[#52645e]">{subject.subject}</p><p className="mt-1 text-[10px] text-[#82a497]">{subject.recommendation}</p></div><span className="text-sm font-black text-[#55ae91]">{subject.accuracy}%</span></div>)}{strongSubjects.length === 0 && <p className="rounded-2xl bg-white/80 p-4 text-sm text-[#82a497]">Upload a dataset to identify strong areas.</p>}</div>
            </div>
          </section>

          <section className="mt-5 flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(111,93,190,0.08)] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#aaa9bd]">Model lab</p><h2 className="mt-1 text-xl font-black text-[#555369]">Train the individual performance model</h2><p className="mt-2 text-sm text-[#aaa9bd]">Use the current subject dataset to refresh weak and strong area predictions.</p>{trainingMessage && <p className="mt-2 text-xs font-bold text-[#8056d9]">{trainingMessage}</p>}</div><button type="button" onClick={() => void trainModel()} disabled={training || !hasPrediction} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#7951db] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#7951db]/20 transition hover:bg-[#6840c5] disabled:cursor-not-allowed disabled:opacity-40"><BrainCircuit className="h-4 w-4" />{training ? 'Training...' : hasPrediction ? 'Train model now' : 'Upload data first'}</button></section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-[28px] bg-[#fff9fc] p-6 shadow-[0_18px_50px_rgba(111,93,190,0.06)]"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#555369]">Quick actions</h2><MoreVertical className="h-4 w-4 text-[#aaa9bd]" /></div><div className="mt-5 grid grid-cols-2 gap-3"><Action icon={<Play />} label="Start quiz" color="bg-[#eee9ff] text-[#8156db]" /><Action icon={<UploadCloud />} label="Upload data" color="bg-[#e8faf3] text-[#55ae91]" /><Action icon={<MessageCircle />} label="Ask AI" color="bg-[#fff0f5] text-[#dc78a0]" onClick={() => setChatOpen(true)} /><Action icon={<LineChart />} label="Model lab" color="bg-[#fff7df] text-[#d2a03e]" /></div></div><div className="rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(111,93,190,0.08)]"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#aaa9bd]">Dataset context</p><h2 className="mt-1 text-xl font-black text-[#555369]">Evidence summary</h2></div><button type="button" onClick={() => setChatOpen(true)} className="text-xs font-bold text-[#8156db]">Ask AI</button></div><div className="mt-5 flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eee9ff] text-[#8056da]"><FileSpreadsheet className="h-5 w-5" /></div><p className="text-sm leading-5 text-[#77758a]">{analysis ? `${analysis.rows} uploaded records are driving this student's ${subjects.length} subject predictions.` : 'Upload a dataset to create an evidence summary. No manual student data is used.'}</p></div></div></section>

          <footer className="flex flex-col items-center justify-between gap-3 px-2 py-7 text-xs text-[#aaa9bd] sm:flex-row"><span className="font-black text-[#7660c7]">LearnPredict AI</span><span>Private learning intelligence · Built for better study moments</span><span className="flex gap-4"><a href="#">Privacy</a><a href="#">Support</a></span></footer>
        </main>
      </div>

      {chatOpen && <aside className="fixed bottom-5 right-5 z-50 flex w-[min(92vw,390px)] flex-col overflow-hidden rounded-[25px] bg-white shadow-2xl ring-1 ring-[#ded7f4]"><div className="flex items-center justify-between bg-gradient-to-r from-[#7546db] to-[#a566ed] p-4 text-white"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/20 p-2"><BrainCircuit className="h-4 w-4" /></div><div><p className="text-sm font-black">LearnPredict AI</p><p className="text-[10px] text-white/70">Your personal study guide</p></div></div><button type="button" onClick={() => setChatOpen(false)} aria-label="Close AI tutor"><X className="h-4 w-4" /></button></div><div className="flex max-h-72 flex-col gap-3 overflow-y-auto bg-[#fbfaff] p-4">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-5 ${item.role === 'user' ? 'self-end bg-[#7951db] text-white' : 'bg-white text-[#66647a] shadow-sm'}`}>{item.text}</div>)}</div><form onSubmit={askAi} className="flex gap-2 border-t border-[#eeeafa] bg-white p-3"><div className="flex flex-1 items-center rounded-full bg-[#f5f2fc] px-3"><Paperclip className="h-4 w-4 text-[#aaa9bd]" /><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about your subjects..." className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none" /></div><button type="submit" disabled={!chatInput.trim()} aria-label="Send message" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7951db] text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form></aside>}
    </div>
  );
}

function SideItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) { return <a href="#" className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-xs font-bold transition ${active ? 'bg-[#f0ebff] text-[#7650d7]' : 'text-[#aaa9bd] hover:bg-[#faf8ff] hover:text-[#7650d7]'}`}>{<span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>}{label}</a>; }
function Avatar({ tone = 'purple' }: { tone?: 'purple' | 'pink' | 'yellow' }) { const colors = { purple: 'from-[#ffcbdd] to-[#8058dd]', pink: 'from-[#ffb7c8] to-[#e878a5]', yellow: 'from-[#f4d281] to-[#e9917d]' }; return <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br ${colors[tone]} text-white`}><UserRound className="h-5 w-5" /></div>; }
function SubjectRow({ subject }: { subject: Subject }) { const style = subject.status === 'critical' ? { bar: 'bg-[#ed7da4]', bg: 'bg-[#fff0f5]', label: 'Needs focus', text: 'text-[#d56d94]' } : subject.status === 'watch' ? { bar: 'bg-[#a376e7]', bg: 'bg-[#f1ecff]', label: 'In progress', text: 'text-[#8056d9]' } : { bar: 'bg-[#7ed5b7]', bg: 'bg-[#e9faf3]', label: 'On track', text: 'text-[#55ae91]' }; return <div className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[#faf9ff]"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.bg} ${style.text}`}><BookOpen className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-xs font-black text-[#656277]">{subject.subject}</p><span className={`text-[10px] font-bold ${style.text}`}>Current {subject.accuracy}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f0eff5]"><div className={`h-full rounded-full ${style.bar}`} style={{ width: `${subject.accuracy}%` }} /></div>{subject.predictedScore !== undefined && <p className="mt-1 text-[10px] text-[#8a8799]">Next-score forecast: <span className="font-bold text-[#6551bf]">{Number(subject.predictedScore).toFixed(1)}%</span>{subject.predictionConfidence !== undefined ? ` (${subject.predictionConfidence}% data confidence)` : ''}</p>}</div><span className="hidden rounded-full bg-[#faf9ff] px-2 py-1 text-[9px] font-bold text-[#aaa9bd] sm:block">{style.label}</span></div>; }
function PlanItem({ color, time, title, detail }: { color: string; time: string; title: string; detail: string }) { return <div className="flex gap-3"><div className="w-10 pt-1 text-[10px] font-bold text-[#aaa9bd]">{time}</div><div className={`w-1 rounded-full ${color}`} /><div className="pb-3"><p className="text-xs font-black text-[#656277]">{title}</p><p className="mt-1 text-[10px] text-[#aaa9bd]">{detail}</p></div></div>; }
function Action({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick?: () => void }) { return <button type="button" onClick={onClick} className="flex flex-col items-start gap-3 rounded-2xl bg-[#faf9ff] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"><span className={`rounded-xl p-2 ${color} [&>svg]:h-4 [&>svg]:w-4`}>{icon}</span><span className="text-xs font-bold text-[#77758a]">{label}</span></button>; }

export default App;
