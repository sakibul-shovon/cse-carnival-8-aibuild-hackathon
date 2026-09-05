import type { Assignment, AssignmentStatus } from "@/types/database";

export type AssignmentInput = {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string;
  deadline: string;
  submission_platform: string;
  status: AssignmentStatus;
  marks: number;
};
export type AssignmentUpdate = Partial<Omit<AssignmentInput, "id">>;

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // fall through
  }
  return `Request failed with status ${res.status}.`;
}

export async function fetchAssignments(
  signal?: AbortSignal
): Promise<Assignment[]> {
  const res = await fetch("/api/assignments", { cache: "no-store", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Assignment[] }).data ?? [];
}

export async function createAssignment(
  input: AssignmentInput
): Promise<Assignment> {
  const res = await fetch("/api/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Assignment }).data;
}

export async function updateAssignment(
  id: string,
  input: AssignmentUpdate
): Promise<Assignment> {
  const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Assignment }).data;
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
