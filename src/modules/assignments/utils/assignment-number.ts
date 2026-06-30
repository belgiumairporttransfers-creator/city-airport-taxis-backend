import assignmentRepository from "@/modules/assignments/repositories/assignment.repository";

const ASSIGNMENT_PREFIX = "ASG";
const MAX_SEQUENCE = 999999;
const MAX_ATTEMPTS = 10;

const formatDatePart = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

export const formatAssignmentNumber = (datePart: string, sequence: number): string =>
  `${ASSIGNMENT_PREFIX}-${datePart}-${sequence.toString().padStart(6, "0")}`;

export const generateAssignmentNumber = async () => {
  const datePart = formatDatePart(new Date());
  let sequence = await assignmentRepository.findMaxSequenceForDate(datePart);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    sequence += 1;

    if (sequence > MAX_SEQUENCE) {
      throw new Error("Assignment number capacity reached for today");
    }

    const assignmentNumber = formatAssignmentNumber(datePart, sequence);
    const existing = await assignmentRepository.findByAssignmentNumber(assignmentNumber);

    if (!existing) {
      return assignmentNumber;
    }
  }

  throw new Error("Failed to generate unique assignment number");
};
