export type ProjectSummary = { id: string; name: string; code: string; sessionCount: number }
export type ClientSummary = { id: string; name: string; industry: string; projects: ProjectSummary[] }
export type TemplateSummary = { id: string; title: string; objective: string; questionCount: number }
export type SessionSummary = {
  id: string
  title: string
  accessCode: string
  status: string
  phase: string
  roundOpen: boolean
  resultsVisible: boolean
  qrSvg: string
  clientId: string
  projectId: string
  templateId: string
  templateTitle: string
  updatedAtUtc: string
}
export type ParticipantSummary = { id: string; displayName: string; isConnected: boolean }
export type ResponseSummary = { id: string; participantName: string; value: string }
export type OutcomeItem = { bucket: string; text: string }
export type SessionSatisfactionSummary = { responseCount: number; averageRating: number; responses?: { id: string; rating: number; comment: string; submittedAtUtc: string }[] }
export type QuestionOption = { id: string; label: string }
export type QuestionRoundContext = { roundQuestionId: string | null; roundNumber: number | null; sectionTitle: string | null; roundTitle: string | null; phase: string; roundOpenedAtUtc: string | null; sessionElapsedSeconds: number | null; roundElapsedSeconds: number | null; sessionClockTracked: boolean }
export type SessionQuestionItem = { id: string; participantName: string; question: string; createdAtUtc: string; roundContext?: QuestionRoundContext | null }
export type SessionAttachment = { id: string; fileName: string; contentType: string; sizeBytes: number; uploadedBy: string; url: string; uploadedAtUtc: string }
export type FacilitatorAuthState = { isAuthenticated: boolean; name?: string | null; isAdmin?: boolean; organizationId?: string | null; organizationName?: string | null }

export type SessionSnapshot = {
  updatedAtUtc: string
  responseCount?: number | null
  id: string
  title: string
  accessCode: string
  status: string
  phase: string
  roundOpen: boolean
  resultsVisible: boolean
  satisfactionSurveyOpen: boolean
  timerSeconds: number
  roundOpenedAtUtc?: string | null
  activeQuestionId: string
  sectionIndex: number
  sectionCount: number
  questionIndex: number
  questionCount: number
  responseVisibility: string
  responseIdentityMode: string
  celebrationStyle: string
  joinUrl: string
  qrSvg: string
  templateTitle: string
  sectionTitle: string
  questionTitle: string
  questionPrompt: string
  questionKind: string
  options: QuestionOption[]
  participants: ParticipantSummary[]
  responses: ResponseSummary[]
  outcomes: OutcomeItem[]
  satisfactionSurvey: SessionSatisfactionSummary
  questionsToFacilitator: SessionQuestionItem[]
  attachments: SessionAttachment[]
}

export type QuestionModelCatalogItem = {
  kind: string
  description: string
}

export type SessionAgendaSection = { id: string; title: string; order: number; questions: { id: string; title: string; order: number }[] }
export type TemplateDefinition = { title: string; objective: string; audience: string; sections: DesignerSectionDraft[] }

export type DesignerQuestionDraft = {
  key: string
  kind: string
  title: string
  prompt: string
  options: QuestionOption[]
  presentation: {
    timerSeconds: number
    responseVisibility: string
    responseIdentityMode: string
    showProgress: boolean
    allowLateResponses: boolean
    celebrationStyle: string
  }
}

export type DesignerSectionDraft = {
  key: string
  title: string
  objective: string
  order: number
  questions: DesignerQuestionDraft[]
}
