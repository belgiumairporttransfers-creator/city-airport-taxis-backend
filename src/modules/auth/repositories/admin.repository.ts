import type { IAdmin } from "@/modules/auth/types/admin.types";
import { Admin } from "@/infrastructure/database/models/Admin";

class AdminRepository {
  findById(id: string) {
    return Admin.findById(id);
  }

  findByIdWithPassword(id: string) {
    return Admin.findById(id).select("+password");
  }

  findByEmail(email: string) {
    return Admin.findOne({ email });
  }

  findByEmailWithPassword(email: string) {
    return Admin.findOne({ email }).select("+password");
  }

  findByResetToken(hashedToken: string) {
    return Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");
  }

  save(admin: IAdmin) {
    return admin.save();
  }

  updatePasswordChangedAt(id: string) {
    return Admin.findByIdAndUpdate(id, { passwordChangedAt: new Date() });
  }
}

export default new AdminRepository();
