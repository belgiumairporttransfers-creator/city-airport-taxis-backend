import crypto from "crypto";
import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import emailService from "@/infrastructure/email/email.service";
import userRepository from "@/modules/auth/repositories/user.repository";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import { normalizeEmail } from "@/modules/auth/utils/email";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import { generateApplicationNumber } from "@/modules/drivers/utils/application-number";
import type {
  CreateDriverApplicationData,
  DriverDocuments,
  GetDriverApplicationsQuery,
  ResubmitDriverApplicationData,
  SubmitDriverApplicationData,
  UpdateDriverApplicationData,
  UploadDriverDocumentData,
} from "@/modules/drivers/types/driver.types";
import {
  DRIVER_DOCUMENT_FIELDS,
  DRIVER_EDITABLE_STATUSES,
  DRIVER_PORTAL_EDITABLE_STATUSES,
  DRIVER_UPLOAD_ALLOWED_STATUSES,
} from "@/modules/drivers/types/driver.types";
import uploadService from "@/modules/upload/services/upload.service";
import notificationService from "@/modules/notifications/services/notification.service";

class DriverService {
  private readonly passwordSetupExpiryMs = 24 * 60 * 60 * 1000;

  private logDriverAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    actorId: string,
    actorType: "admin" | "user" | "system",
    applicationId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId,
      actorType,
      entityType: "driver-application",
      entityId: applicationId,
      metadata,
    });
  }

  private async notifyAdminsAboutDriver(
    application: {
      _id: { toString(): string };
      firstName: string;
      lastName: string;
    },
    payload: {
      title: string;
      message: string;
      type: string;
      severity: "info" | "success" | "warning" | "error";
    }
  ) {
    try {
      await notificationService.notifyAdmins({
        title: payload.title,
        message: payload.message,
        type: payload.type,
        severity: payload.severity,
        entityType: "driver",
        entityId: application._id.toString(),
        actionUrl: `/drivers/${application._id.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to create driver admin notification", { error });
    }
  }

  private async getApplicationOrThrow(id: string) {
    const application = await driverRepository.findById(id);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    return application;
  }

  private assertStatus(
    application: { status: string },
    allowed: string[],
    message: string
  ) {
    if (!allowed.includes(application.status)) {
      throw new AppError(message, 400);
    }
  }

  private normalizeLicensePlate(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, "");
  }

  private toPlainDocuments(documents: DriverDocuments | Record<string, unknown>): DriverDocuments {
    if (
      typeof documents === "object" &&
      documents !== null &&
      typeof (documents as { toObject?: () => DriverDocuments }).toObject === "function"
    ) {
      return (documents as { toObject: () => DriverDocuments }).toObject();
    }

    return { ...(documents as DriverDocuments) };
  }

  private mergeDocuments(
    existing: DriverDocuments,
    updates?: Partial<DriverDocuments>
  ): DriverDocuments {
    const base = this.toPlainDocuments(existing);

    if (!updates) {
      return base;
    }

    return {
      ...base,
      ...Object.fromEntries(
        Object.entries(updates).filter(([, value]) => typeof value === "string" && value.length > 0)
      ),
    } as DriverDocuments;
  }

  private assertRequiredDocuments(documents: Partial<DriverDocuments>) {
    const missing = DRIVER_DOCUMENT_FIELDS.filter((field) => !documents[field]?.trim());

    if (missing.length > 0) {
      throw new AppError(`Missing required documents: ${missing.join(", ")}`, 400);
    }
  }
  private async createPasswordSetupToken(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User account not found", 404);
    }

    const setupToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(setupToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + this.passwordSetupExpiryMs);
    await userRepository.save(user);

    return setupToken;
  }

  private async ensureDriverUser(application: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profilePhoto?: string;
  }) {
    const email = normalizeEmail(application.email);
    const profilePhoto = application.profilePhoto?.trim() || undefined;
    let user = await userRepository.findByEmail(email);

    if (user) {
      user.role = DRIVER_ROLE;
      user.firstName = application.firstName;
      user.lastName = application.lastName;
      user.phoneNumber = application.phone;
      user.status = "active";
      user.isVerified = true;
      if (profilePhoto && !user.avatar?.trim()) {
        user.avatar = profilePhoto;
      }
      await userRepository.save(user);
      return user;
    }

    const temporaryPassword = crypto.randomBytes(32).toString("hex");

    user = await userRepository.create({
      firstName: application.firstName,
      lastName: application.lastName,
      email,
      phoneNumber: application.phone,
      password: temporaryPassword,
      role: DRIVER_ROLE,
      status: "active",
      isVerified: true,
      avatar: profilePhoto,
    });

    return user;
  }

  async submitApplication(data: SubmitDriverApplicationData) {
    const email = normalizeEmail(data.email);
    this.assertRequiredDocuments(data.documents);

    const existingActive = await driverRepository.findActiveByEmail(email);

    if (existingActive) {
      throw new AppError("An active driver application already exists for this email", 409);
    }

    const applicationNumber = await generateApplicationNumber();
    const application = await driverRepository.create({
      ...data,
      email,
      licensePlate: this.normalizeLicensePlate(data.licensePlate),
      applicationNumber,
      status: "pending",
    });

    this.logDriverAudit(
      AuditEvents.DRIVER_APPLICATION_CREATED,
      email,
      "user",
      application._id.toString(),
      { applicationNumber, email }
    );

    await emailService.sendDriverApplicationReceivedEmail(application, applicationNumber);

    await this.notifyAdminsAboutDriver(application, {
      title: "New Driver Application",
      message: `${application.firstName} ${application.lastName} submitted a driver application.`,
      type: "driver.application.submitted",
      severity: "info",
    });

    return application;
  }

  async createApplicationByAdmin(data: CreateDriverApplicationData, adminId: string) {
    const email = normalizeEmail(data.email);
    this.assertRequiredDocuments(data.documents);

    const existingActive = await driverRepository.findActiveByEmail(email);

    if (existingActive) {
      throw new AppError("An active driver application already exists for this email", 409);
    }

    const applicationNumber = await generateApplicationNumber();
    const application = await driverRepository.create({
      operatingCountry: data.operatingCountry,
      operatingCity: data.operatingCity,
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      phone: data.phone,
      homeAddress: data.homeAddress,
      carType: data.carType,
      carColor: data.carColor,
      licensePlate: this.normalizeLicensePlate(data.licensePlate),
      carYearModel: data.carYearModel,
      yearsOfExperience: data.yearsOfExperience,
      shiftType: data.shiftType,
      availableFrom: data.availableFrom,
      availableTo: data.availableTo,
      profilePhoto: data.profilePhoto ?? "",
      about: data.about ?? "",
      skills: data.skills ?? [],
      documents: data.documents,
      applicationNumber,
      status: "pending",
    });

    this.logDriverAudit(
      AuditEvents.DRIVER_APPLICATION_CREATED,
      adminId,
      "admin",
      application._id.toString(),
      { applicationNumber, email, createdBy: "admin" }
    );

    await this.notifyAdminsAboutDriver(application, {
      title: "New Driver Application",
      message: `${application.firstName} ${application.lastName} submitted a driver application.`,
      type: "driver.application.submitted",
      severity: "info",
    });

    return application;
  }

  async resubmitApplication(applicationNumber: string, data: ResubmitDriverApplicationData) {
    const application = await driverRepository.findByApplicationNumber(applicationNumber);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    if (normalizeEmail(application.email) !== normalizeEmail(data.email)) {
      throw new AppError("Email does not match this application", 403);
    }

    this.assertStatus(
      application,
      ["changes_requested"],
      "Only applications with requested changes can be resubmitted"
    );

    const mergedDocuments = this.mergeDocuments(application.documents, data.documents);
    this.assertRequiredDocuments(mergedDocuments);

    const updated = await driverRepository.updateById(application._id.toString(), {
      ...(data.operatingCountry ? { operatingCountry: data.operatingCountry } : {}),
      ...(data.operatingCity ? { operatingCity: data.operatingCity } : {}),
      ...(data.firstName ? { firstName: data.firstName } : {}),
      ...(data.lastName ? { lastName: data.lastName } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.homeAddress ? { homeAddress: data.homeAddress } : {}),
      ...(data.carType ? { carType: data.carType } : {}),
      ...(data.carColor ? { carColor: data.carColor } : {}),
      ...(data.licensePlate
        ? { licensePlate: this.normalizeLicensePlate(data.licensePlate) }
        : {}),
      ...(data.carYearModel ? { carYearModel: data.carYearModel } : {}),
      ...(data.yearsOfExperience !== undefined
        ? { yearsOfExperience: data.yearsOfExperience }
        : {}),
      ...(data.shiftType ? { shiftType: data.shiftType } : {}),
      ...(data.availableFrom ? { availableFrom: data.availableFrom } : {}),
      ...(data.availableTo ? { availableTo: data.availableTo } : {}),
      documents: mergedDocuments,
      status: "under_review",
      reviewNotes: undefined,
    });

    if (!updated) {
      throw new AppError("Driver application not found", 404);
    }

    this.logDriverAudit(
      AuditEvents.DRIVER_APPLICATION_UPDATED,
      application.email,
      "user",
      updated._id.toString(),
      { applicationNumber: updated.applicationNumber, status: updated.status }
    );

    await emailService.sendDriverApplicationResubmittedEmail(
      updated,
      updated.applicationNumber
    );

    return updated;
  }

  async getApplicationStatus(applicationNumber: string) {
    const application = await driverRepository.findByApplicationNumber(applicationNumber);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    return application;
  }

  async uploadDocument(data: UploadDriverDocumentData, file: Express.Multer.File) {
    const application = await driverRepository.findByApplicationNumber(data.applicationNumber);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    if (normalizeEmail(application.email) !== normalizeEmail(data.email)) {
      throw new AppError("Email does not match this application", 403);
    }

    this.assertStatus(
      application,
      [...DRIVER_UPLOAD_ALLOWED_STATUSES],
      "Documents cannot be uploaded for this application status"
    );

    const result = await uploadService.uploadDocument(file, "driver-applications");

    return {
      url: result.url,
      publicId: result.public_id,
    };
  }

  async getApplications(query: GetDriverApplicationsQuery) {
    const result = await driverRepository.findWithPagination(query);

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async getApplication(id: string) {
    return this.getApplicationOrThrow(id);
  }

  async getApplicationForUser(userId: string) {
    const application = await driverRepository.findByUserId(userId);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    return application;
  }

  async updateApplicationForUser(userId: string, data: UpdateDriverApplicationData) {
    const application = await driverRepository.findByUserId(userId);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    if (
      !(DRIVER_PORTAL_EDITABLE_STATUSES as readonly string[]).includes(application.status)
    ) {
      throw new AppError("This application cannot be edited", 409);
    }

    const updatePayload: UpdateDriverApplicationData & Record<string, unknown> = {
      ...data,
      ...(data.licensePlate
        ? { licensePlate: this.normalizeLicensePlate(data.licensePlate) }
        : {}),
      ...(data.documents
        ? { documents: this.mergeDocuments(application.documents, data.documents) }
        : {}),
    };

    const updated = await driverRepository.updateById(
      application._id.toString(),
      updatePayload
    );

    if (!updated) {
      throw new AppError("Driver application not found", 404);
    }

    if (application.userId) {
      const user = await userRepository.findById(application.userId.toString());

      if (user) {
        if (data.firstName) {
          user.firstName = data.firstName;
        }
        if (data.lastName) {
          user.lastName = data.lastName;
        }
        if (data.phone) {
          user.phoneNumber = data.phone;
        }
        if (data.profilePhoto?.trim()) {
          user.avatar = data.profilePhoto.trim();
        }
        await userRepository.save(user);
      }
    }

    this.logDriverAudit(
      AuditEvents.DRIVER_APPLICATION_UPDATED,
      userId,
      "user",
      application._id.toString(),
      {
        applicationNumber: updated.applicationNumber,
        status: updated.status,
        source: "driver-portal",
      }
    );

    const driverName = `${updated.firstName} ${updated.lastName}`;

    if (data.documents) {
      const mergedDocuments = this.mergeDocuments(application.documents, data.documents);
      const documentsChanged =
        JSON.stringify(this.toPlainDocuments(application.documents)) !==
        JSON.stringify(mergedDocuments);

      if (documentsChanged) {
        await this.notifyAdminsAboutDriver(updated, {
          title: "Driver Documents Updated",
          message: `${driverName} updated their license and document uploads.`,
          type: "driver.application.documents_updated",
          severity: "info",
        });
      }
    }

    const vehicleChanged = (
      [
        "carType",
        "carColor",
        "licensePlate",
        "carYearModel",
        "shiftType",
        "availableFrom",
        "availableTo",
      ] as const
    ).some((field) => {
      if (data[field] === undefined) {
        return false;
      }

      const nextValue =
        field === "licensePlate"
          ? this.normalizeLicensePlate(data.licensePlate!)
          : data[field];

      return application[field] !== nextValue;
    });

    if (vehicleChanged) {
      await this.notifyAdminsAboutDriver(updated, {
        title: "Vehicle Information Updated",
        message: `${driverName} updated their vehicle information.`,
        type: "driver.application.vehicle_updated",
        severity: "info",
      });
    }

    return updated;
  }

  async updateApplication(id: string, data: UpdateDriverApplicationData, adminId: string) {
    const existing = await this.getApplicationOrThrow(id);

    if (!(DRIVER_EDITABLE_STATUSES as readonly string[]).includes(existing.status)) {
      throw new AppError("This application is locked and cannot be edited", 409);
    }

    const updatePayload: UpdateDriverApplicationData & Record<string, unknown> = {
      ...data,
      ...(data.licensePlate
        ? { licensePlate: this.normalizeLicensePlate(data.licensePlate) }
        : {}),
      ...(data.documents
        ? { documents: this.mergeDocuments(existing.documents, data.documents) }
        : {}),
    };

    const application = await driverRepository.updateById(id, updatePayload);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    this.logDriverAudit(AuditEvents.DRIVER_APPLICATION_UPDATED, adminId, "admin", id, {
      applicationNumber: application.applicationNumber,
      status: application.status,
    });

    return application;
  }

  async startReview(id: string, adminId: string) {
    const existing = await this.getApplicationOrThrow(id);

    this.assertStatus(
      existing,
      ["pending", "changes_requested"],
      "Only pending or changes-requested applications can be moved to review"
    );

    const application = await driverRepository.updateById(id, {
      status: "under_review",
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    this.logDriverAudit(AuditEvents.DRIVER_APPLICATION_REVIEW_STARTED, adminId, "admin", id, {
      applicationNumber: application.applicationNumber,
    });

    await emailService.sendDriverApplicationUnderReviewEmail(
      application,
      application.applicationNumber
    );

    return application;
  }

  async requestChanges(id: string, reviewNotes: string, adminId: string) {
    const existing = await this.getApplicationOrThrow(id);

    this.assertStatus(
      existing,
      ["under_review"],
      "Only applications under review can have changes requested"
    );

    const application = await driverRepository.updateById(id, {
      status: "changes_requested",
      reviewNotes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    this.logDriverAudit(
      AuditEvents.DRIVER_APPLICATION_CHANGES_REQUESTED,
      adminId,
      "admin",
      id,
      { applicationNumber: application.applicationNumber }
    );

    await emailService.sendDriverChangesRequestedEmail(
      application,
      application.applicationNumber,
      reviewNotes
    );

    return application;
  }

  async approveApplication(id: string, adminId: string) {
    const existing = await this.getApplicationOrThrow(id);

    this.assertStatus(
      existing,
      ["under_review"],
      "Only applications under review can be approved"
    );

    const user = await this.ensureDriverUser(existing);
    const setupToken = await this.createPasswordSetupToken(user._id.toString());

    const application = await driverRepository.updateById(id, {
      status: "approved",
      userId: user._id.toString(),
      reviewedBy: adminId,
      reviewedAt: new Date(),
      approvedAt: new Date(),
      reviewNotes: undefined,
    });

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    this.logDriverAudit(AuditEvents.DRIVER_APPLICATION_APPROVED, adminId, "admin", id, {
      applicationNumber: application.applicationNumber,
      userId: user._id.toString(),
    });

    await emailService.sendDriverApplicationApprovedEmail(application, setupToken);

    return application;
  }

  async rejectApplication(id: string, reviewNotes: string, adminId: string) {
    const existing = await this.getApplicationOrThrow(id);

    this.assertStatus(
      existing,
      ["under_review"],
      "Only applications under review can be rejected"
    );

    const application = await driverRepository.updateById(id, {
      status: "rejected",
      reviewNotes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectedAt: new Date(),
    });

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    this.logDriverAudit(AuditEvents.DRIVER_APPLICATION_REJECTED, adminId, "admin", id, {
      applicationNumber: application.applicationNumber,
    });

    await emailService.sendDriverApplicationRejectedEmail(
      application,
      application.applicationNumber,
      reviewNotes
    );

    return application;
  }

  async suspendDriver(id: string, adminId: string, reviewNotes?: string) {
    const existing = await this.getApplicationOrThrow(id);

    this.assertStatus(existing, ["approved"], "Only approved drivers can be suspended");

    const application = await driverRepository.updateById(id, {
      status: "suspended",
      reviewNotes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    if (application.userId) {
      const user = await userRepository.findById(application.userId.toString());
      if (user) {
        user.status = "suspended";
        user.statusReason = reviewNotes;
        await userRepository.save(user);
      }
    }

    this.logDriverAudit(AuditEvents.DRIVER_APPLICATION_SUSPENDED, adminId, "admin", id, {
      applicationNumber: application.applicationNumber,
    });

    await emailService.sendDriverSuspendedEmail(application, reviewNotes);

    return application;
  }

  async getApplicationStats() {
    const counts = await driverRepository.countByStatus();
    const byStatus = Object.fromEntries(counts.map((item) => [item.status, item.count]));

    const pending = byStatus.pending ?? 0;
    const underReview = byStatus.under_review ?? 0;
    const changesRequested = byStatus.changes_requested ?? 0;
    const approved = byStatus.approved ?? 0;
    const rejected = byStatus.rejected ?? 0;
    const suspended = byStatus.suspended ?? 0;

    return {
      pending,
      underReview,
      changesRequested,
      approved,
      rejected,
      suspended,
      total: pending + underReview + changesRequested + approved + rejected + suspended,
    };
  }

  async countApplicationsByStatus() {
    return driverRepository.countByStatus();
  }
}

export default new DriverService();
