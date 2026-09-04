import type { AssignmentStatus, Prisma } from "@prisma/client";
import { database } from "../../config/database.js";
import type { AssignmentInput, AssignmentListQuery, AssignmentUpdateInput } from "./assignments.validation.js";

export const assignmentsModel = {
  findMany(query: AssignmentListQuery = {}) {
    const include = {
      course: true,
      submissions: query.userId ? { where: { user: { externalId: query.userId } } } : false
    } satisfies Prisma.AssignmentInclude;
    return database.assignment.findMany({
      where: {
        dueAt: query.from || query.dueBefore
          ? { gte: query.from ? new Date(query.from) : undefined, lte: query.dueBefore ? new Date(query.dueBefore) : undefined }
          : undefined,
        submissions: query.status
          ? { some: { status: query.status, ...(query.userId ? { user: { externalId: query.userId } } : {}) } }
          : undefined
      },
      include,
      orderBy: { dueAt: "asc" }
    });
  },
  findById(id: string) { return database.assignment.findUnique({ where: { id }, include: { course: true } }); },
  create(input: AssignmentInput) {
    return database.$transaction(async (transaction) => {
      const course = await transaction.course.upsert({
        where: { code: input.courseCode.toUpperCase() },
        update: { title: input.courseTitle, department: input.department },
        create: { code: input.courseCode.toUpperCase(), title: input.courseTitle, department: input.department }
      });
      return transaction.assignment.create({
        data: {
          courseId: course.id, title: input.title, description: input.description,
          assignedAt: new Date(input.assignedAt), dueAt: new Date(input.dueAt),
          submissionPlatform: input.submissionPlatform, marks: input.marks
        },
        include: { course: true }
      });
    });
  },
  update(id: string, input: AssignmentUpdateInput) {
    return database.$transaction(async (transaction) => {
      const course = input.courseCode
        ? await transaction.course.upsert({
            where: { code: input.courseCode.toUpperCase() },
            update: { title: input.courseTitle, department: input.department },
            create: { code: input.courseCode.toUpperCase(), title: input.courseTitle ?? input.courseCode, department: input.department ?? "CSE" }
          })
        : undefined;
      return transaction.assignment.update({
        where: { id },
        data: {
          courseId: course?.id, title: input.title, description: input.description,
          assignedAt: input.assignedAt ? new Date(input.assignedAt) : undefined,
          dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
          submissionPlatform: input.submissionPlatform, marks: input.marks
        },
        include: { course: true }
      });
    });
  },
  delete(id: string) { return database.assignment.delete({ where: { id } }); },
  setStatus(assignmentId: string, externalUserId: string, status: AssignmentStatus) {
    return database.$transaction(async (transaction) => {
      const user = await transaction.user.findUniqueOrThrow({ where: { externalId: externalUserId } });
      return transaction.assignmentSubmission.upsert({
        where: { assignmentId_userId: { assignmentId, userId: user.id } },
        update: { status, submittedAt: status === "SUBMITTED" ? new Date() : undefined },
        create: { assignmentId, userId: user.id, status, submittedAt: status === "SUBMITTED" ? new Date() : undefined }
      });
    });
  }
};
