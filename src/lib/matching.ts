// src/lib/matching.ts
// Doctor-client matching engine

export interface DoctorProfile {
  uid:            string;
  displayName:    string;
  email:          string;
  title:          string;          // e.g. "Clinical Psychologist"
  bio:            string;
  photoURL?:      string;
  specializations: string[];       // e.g. ["Anxiety", "Trauma", "Depression"]
  sessionTypes:   string[];        // e.g. ["Individual Therapy", "Couples Therapy"]
  languages:      string[];        // e.g. ["English", "Spanish"]
  approaches:     string[];        // e.g. ["CBT", "DBT", "Psychodynamic"]
  acceptingClients: boolean;
  maxClients:     number;
  currentClients: number;
  yearsExperience: number;
  gender:         "male" | "female" | "non-binary" | "prefer-not-to-say";
  timezone:       string;
  createdAt?:     any;
  updatedAt?:     any;
}

export interface IntakeResponses {
  presentingConcerns: string[];    // multiselect
  sessionType:        string;      // single
  therapyGoals:       string[];    // multiselect
  previousTherapy:    string;      // yes / no / unsure
  urgency:            string;      // low / moderate / high / crisis
  preferredGender:    string;      // any / male / female
  preferredLanguage:  string;      // English / Spanish / etc
  preferredApproach:  string[];    // multiselect — optional
  ageGroup:           string;      // adult / young-adult / child / couple
}

// ── Concern → specialization mapping ──────────────────────────────────────
const CONCERN_SPEC_MAP: Record<string, string[]> = {
  "Anxiety & Worry":         ["Anxiety", "Stress", "Panic Disorder", "OCD"],
  "Depression & Low Mood":   ["Depression", "Mood Disorders", "Bipolar"],
  "Trauma & PTSD":           ["Trauma", "PTSD", "Abuse", "Grief"],
  "Relationship Issues":     ["Relationship Therapy", "Couples Therapy", "Family Therapy"],
  "Work & Career Stress":    ["Workplace Wellness", "Burnout", "Stress"],
  "Grief & Loss":            ["Grief", "Bereavement", "Trauma"],
  "Self-Esteem & Identity":  ["Self-Esteem", "Identity", "Personal Development"],
  "Anger Management":        ["Anger Management", "Emotional Regulation"],
  "Eating & Body Image":     ["Eating Disorders", "Body Dysmorphia"],
  "Addiction & Substance":   ["Addiction", "Substance Use", "Recovery"],
  "ADHD & Focus":            ["ADHD", "Executive Function", "Neurodivergence"],
  "Sleep & Fatigue":         ["Sleep Disorders", "Chronic Illness", "Stress"],
  "Life Transitions":        ["Life Coaching", "Personal Development", "Transitions"],
  "Parenting & Family":      ["Family Therapy", "Parenting", "Child Psychology"],
};

// ── Main scoring function ──────────────────────────────────────────────────
export function scoreDoctor(
  doctor:  DoctorProfile,
  intake:  IntakeResponses
): number {
  let score = 0;

  // 1. Not accepting clients → disqualified
  if (!doctor.acceptingClients) return -1;

  // 2. At capacity → heavily penalised
  if (doctor.currentClients >= doctor.maxClients) score -= 40;

  // 3. Specialization match (max 40 points)
  const relatedSpecs = intake.presentingConcerns.flatMap(c => CONCERN_SPEC_MAP[c] ?? []);
  const specMatches  = relatedSpecs.filter(s =>
    doctor.specializations.some(ds => ds.toLowerCase().includes(s.toLowerCase()))
  ).length;
  score += Math.min(specMatches * 8, 40);

  // 4. Session type match (max 20 points)
  if (doctor.sessionTypes.includes(intake.sessionType)) score += 20;
  else if (intake.sessionType === "Not sure" || intake.sessionType === "") score += 10;

  // 5. Language match (max 15 points)
  if (doctor.languages.includes(intake.preferredLanguage)) score += 15;
  else if (intake.preferredLanguage === "Any" || intake.preferredLanguage === "") score += 15;

  // 6. Gender preference (max 10 points)
  if (intake.preferredGender === "Any" || intake.preferredGender === "") score += 10;
  else if (doctor.gender === intake.preferredGender) score += 10;
  else score -= 20; // hard preference not met

  // 7. Therapeutic approach match (max 10 points)
  if (intake.preferredApproach.length > 0) {
    const approachMatches = intake.preferredApproach.filter(a =>
      doctor.approaches.some(da => da.toLowerCase().includes(a.toLowerCase()))
    ).length;
    score += Math.min(approachMatches * 5, 10);
  } else {
    score += 5; // no preference = neutral
  }

  // 8. Availability bonus — fewer clients = more available
  const availabilityRatio = 1 - (doctor.currentClients / Math.max(doctor.maxClients, 1));
  score += Math.round(availabilityRatio * 5);

  // 9. Experience bonus (max 5 points)
  score += Math.min(Math.floor(doctor.yearsExperience / 2), 5);

  return Math.max(score, 0);
}

export function matchDoctors(
  doctors: DoctorProfile[],
  intake:  IntakeResponses
): { doctor: DoctorProfile; score: number; matchPercent: number }[] {
  const scored = doctors
    .map(d => ({ doctor: d, score: scoreDoctor(d, intake) }))
    .filter(d => d.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const maxScore = scored[0].score;

  return scored.map(d => ({
    ...d,
    matchPercent: maxScore > 0 ? Math.round((d.score / maxScore) * 100) : 50,
  }));
}

// ── Intake question definitions (used by UI) ───────────────────────────────
export const INTAKE_QUESTIONS = [
  {
    id:       "presentingConcerns",
    question: "What brings you to therapy today?",
    subtext:  "Select all that apply.",
    type:     "multiselect" as const,
    options:  Object.keys(CONCERN_SPEC_MAP),
  },
  {
    id:       "sessionType",
    question: "What type of sessions are you looking for?",
    subtext:  "Choose the option that best fits your situation.",
    type:     "single" as const,
    options:  [
      "Individual Therapy",
      "Couples Therapy",
      "Family Therapy",
      "Life Coaching",
      "Workplace Wellness",
      "Not sure yet",
    ],
  },
  {
    id:       "therapyGoals",
    question: "What are your main goals for therapy?",
    subtext:  "Select up to 3.",
    type:     "multiselect" as const,
    max:      3,
    options:  [
      "Manage anxiety or stress",
      "Improve my mood",
      "Process past trauma",
      "Improve relationships",
      "Build self-confidence",
      "Develop coping strategies",
      "Work through grief",
      "Improve work-life balance",
      "Understand myself better",
      "Other",
    ],
  },
  {
    id:       "urgency",
    question: "How are you feeling right now?",
    subtext:  "This helps us prioritise your care.",
    type:     "single" as const,
    options:  [
      "I'm managing but could use support",
      "I'm struggling and need help soon",
      "I'm in a difficult place and need urgent support",
      "I'm in crisis and need immediate help",
    ],
    values:   ["low", "moderate", "high", "crisis"],
  },
  {
    id:       "previousTherapy",
    question: "Have you been in therapy before?",
    subtext:  "",
    type:     "single" as const,
    options:  ["Yes, and it was helpful", "Yes, but I had a difficult experience", "No, this is my first time", "Not sure"],
    values:   ["helpful", "difficult", "first-time", "unsure"],
  },
  {
    id:       "preferredGender",
    question: "Do you have a preference for your therapist's gender?",
    subtext:  "There is no wrong answer.",
    type:     "single" as const,
    options:  ["No preference", "Female therapist", "Male therapist"],
    values:   ["Any", "female", "male"],
  },
  {
    id:       "preferredLanguage",
    question: "What language do you prefer for your sessions?",
    subtext:  "",
    type:     "single" as const,
    options:  ["English", "Spanish", "French", "Other"],
    values:   ["English", "Spanish", "French", "Any"],
  },
];
