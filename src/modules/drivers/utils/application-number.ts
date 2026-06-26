import driverRepository from "@/modules/drivers/repositories/driver.repository";

const APPLICATION_PREFIX = "DRV";
const MAX_SEQUENCE = 9999;
const MAX_ATTEMPTS = 10;

export const formatApplicationNumber = (sequence: number): string =>
  `${APPLICATION_PREFIX}-${sequence.toString().padStart(4, "0")}`;

export const generateApplicationNumber = async (): Promise<string> => {
  let sequence = await driverRepository.findMaxApplicationSequence();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    sequence += 1;

    if (sequence > MAX_SEQUENCE) {
      throw new Error("Application number capacity reached");
    }

    const applicationNumber = formatApplicationNumber(sequence);
    const existing = await driverRepository.findByApplicationNumber(applicationNumber);

    if (!existing) {
      return applicationNumber;
    }
  }

  throw new Error("Failed to generate unique application number");
};
