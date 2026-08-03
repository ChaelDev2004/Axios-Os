export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  projects: {
    all: () => [...dashboardKeys.all, "projects"] as const,
    list: () => [...dashboardKeys.projects.all(), "list"] as const,
    detail: (id: string) => [...dashboardKeys.projects.all(), "detail", id] as const,
  },
  tasks: {
    all: () => [...dashboardKeys.all, "tasks"] as const,
    list: (filters?: { projectId?: string }) =>
      [...dashboardKeys.tasks.all(), "list", filters ?? {}] as const,
    detail: (id: string) => [...dashboardKeys.tasks.all(), "detail", id] as const,
  },
  pomodoro: {
    all: () => [...dashboardKeys.all, "pomodoro"] as const,
    list: () => [...dashboardKeys.pomodoro.all(), "list"] as const,
  },
  transactions: {
    all: () => [...dashboardKeys.all, "transactions"] as const,
    list: () => [...dashboardKeys.transactions.all(), "list"] as const,
    detail: (id: string) => [...dashboardKeys.transactions.all(), "detail", id] as const,
  },
  notes: {
    all: () => [...dashboardKeys.all, "notes"] as const,
    list: (filters?: { taskId?: string; dueDate?: string }) =>
      [...dashboardKeys.notes.all(), "list", filters ?? {}] as const,
    detail: (id: string) => [...dashboardKeys.notes.all(), "detail", id] as const,
  },
  portfolio: {
    all: () => [...dashboardKeys.all, "portfolio"] as const,
    list: () => [...dashboardKeys.portfolio.all(), "list"] as const,
    detail: (id: string) => [...dashboardKeys.portfolio.all(), "detail", id] as const,
    views: (filters?: { days?: number; projectId?: string }) =>
      [...dashboardKeys.portfolio.all(), "views", filters ?? {}] as const,
    landingVisits: (filters?: { days?: number }) =>
      [...dashboardKeys.portfolio.all(), "landing-visits", filters ?? {}] as const,
  },
  notifications: {
    all: () => [...dashboardKeys.all, "notifications"] as const,
    list: () => [...dashboardKeys.notifications.all(), "list"] as const,
  },
  ai: {
    all: () => [...dashboardKeys.all, "ai"] as const,
    list: () => [...dashboardKeys.ai.all(), "list"] as const,
  },
} as const;
