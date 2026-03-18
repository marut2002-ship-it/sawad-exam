export interface Employee {
  id: string;
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  position: string;
  branch: string;
  branchShort: string;
  zone: string;
  region: string;
  isManager: boolean;
}

export interface Question {
  id: string;
  category: string;
  level: string;
  topic: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
  explanation: string;
  image: string;
  explanationImage: string;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  selectedText: string;
  correctAnswer: string;
  correctText: string;
  isCorrect: boolean;
  explanation: string;
  questionImage: string;
  explanationImage: string;
  topic: string;
}

export interface ExamResult {
  timestamp: string;
  score: number;
  totalQuestions: number;
  employeeId: string;
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  position: string;
  branch: string;
  zone: string;
  region: string;
  email: string;
  photo: string;
  pdpaConsent: string;
  results: QuestionResult[];
  tabSwitches?: number;
  timeSpent?: string;
  deviceLog?: string;
  rawData?: string;
  pdfUrl?: string;
}

export interface SubmissionData {
  action: 'submitExam';
  timestamp: string;
  score: number;
  totalQuestions: number;
  employeeId: string;
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  position: string;
  branch: string;
  zone: string;
  region: string;
  email: string;
  photo: string;
  pdpaConsent: string;
  results: QuestionResult[];
  tabSwitches: number;
  timeSpent: string;
  deviceLog: string;
  rawData: string;
}

export interface SystemStatus {
  registrationStatus: "OPEN" | "CLOSED";
  announcement: string;
}

export interface AdminOverview {
  stats: {
    totalEmployees: number;
    completed: number;
    avgScore: number;
  };
  scoreDistribution?: {
    [range: string]: number;
  };
  questionStats: any[];
}

export interface EmployeeRecord {
  employeeId: string;
  name: string;
  nickname: string;
  position: string;
  branch: string;
  zone?: string;
  region: string;
  isManager: boolean;
  examInfo: {
    score: number;
    timestamp: string;
    pdfUrl: string;
    photoUrl: string;
    tabSwitches: number;
    timeSpent: string;
    status: string;
  } | null;
}

export interface PaginatedEmployees {
  data: EmployeeRecord[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminResult {
  employeeId: string;
  name: string;
  region: string;
  branch?: string;
  score: string;
  totalQuestions: string;
  examStatus: string;
  tabSwitches: string;
  timeSpent: string;
  isManager: string;
  timestamp?: string;
  photo?: string;
  pdfUrl?: string;
}

export interface QuestionStat {
  id: string;
  text: string;
  failRate: number;
}
