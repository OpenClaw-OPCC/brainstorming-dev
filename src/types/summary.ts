export interface Feature {
  name: string;
  description: string;
  priority: string;
}

export interface Risk {
  description: string;
  mitigation: string;
  severity: string;
}

export interface Summary {
  overview: string;
  features: Feature[];
  technicalPlan?: string;
  interactions?: string;
  risks: Risk[];
  openQuestions: string[];
  generatedAt: string;
}
