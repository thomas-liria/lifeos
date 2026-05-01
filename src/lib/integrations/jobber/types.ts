export interface JobberTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;
  connectedAt?: number;
  lastSyncedAt?: number;
}

export interface JobberInvoice {
  id:           string;
  invoiceNumber: string;
  clientName:   string;
  total:        number;
  dueDate:      string;
  daysOverdue:  number;
}

export interface JobberJob {
  id:             string;
  title:          string;
  clientName:     string;
  scheduledStart: string;
}

export interface JobberRequest {
  id:          string;
  clientName:  string;
  description: string;
  createdAt:   string;
}

export interface JobberData {
  overdueInvoices:    JobberInvoice[];
  upcomingJobs:       JobberJob[];
  recentRequests:     JobberRequest[];
  outstandingBalance: number;
  isMock:             boolean;
}

export interface UpdatedJobberToken {
  accessToken: string;
  expiresAt:   number;
}
