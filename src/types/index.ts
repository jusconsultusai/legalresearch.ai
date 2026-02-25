export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role: string;
  purpose?: string;
  userRole?: string;
  firmName?: string;
  teamSize?: string;
  hoursPerWeek?: number;
  plan: string;
  searchesLeft: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: SourceReference[];
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  mode: string;
  sources: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface SourceReference {
  documentId: string;
  title: string;
  category: string;
  subcategory: string;
  number?: string;
  date?: string;
  summary?: string;
  relevantText?: string;
  score?: number;
}

export interface LegalDocument {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  number?: string;
  date?: string;
  fullText?: string;
  summary?: string;
  digest?: string;
  doctrine?: string;
  facts?: string;
  metadata?: Record<string, unknown>;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  contentJson?: string;
  type: string;
  templateId?: string;
  userId: string;
  organizationId?: string;
  isPublic: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  documentId: string;
  userId: string;
  parentId?: string;
  resolved: boolean;
  position?: string;
  createdAt: string;
  user?: { name: string; avatar?: string };
}

export interface Bookmark {
  id: string;
  userId: string;
  documentRef: string;
  category: string;
  title: string;
  notes?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  members?: OrganizationMember[];
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  user?: User;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  content: string;
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: "text" | "date" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  defaultValue?: string;
}

export interface SearchFilters {
  categories?: string[];
  subcategories?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "relevance" | "date" | "title";
}

export interface AnalysisResult {
  type: "grammar" | "legal_context" | "legal_clarity" | "full";
  content: string;
  score?: number;
  issues?: AnalysisIssue[];
}

export interface AnalysisIssue {
  type: "error" | "warning" | "suggestion";
  message: string;
  location?: string;
  suggestion?: string;
}

export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}
