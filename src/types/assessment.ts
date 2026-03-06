export interface AssessmentQuestion {
  id:       string;
  text:     string;
  type:     "text" | "scale" | "multiple_choice";
  options?: string[];
}

export interface AssessmentTemplate {
  id:          string;
  doctorId:    string;
  title:       string;
  description: string;
  questions:   AssessmentQuestion[];
  createdAt:   Date;
}

export interface Assessment {
  id:          string;
  templateId:  string;
  clientId:    string;
  doctorId:    string;
  responses:   { questionId: string; answer: string | number }[];
  score?:      number;
  aiSummary?:  string;
  aiRiskFlag?: boolean;
  status:      "assigned" | "completed" | "reviewed";
  completedAt?: Date;
  reviewedAt?:  Date;
}