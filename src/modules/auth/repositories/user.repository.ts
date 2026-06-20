import type { IUser } from "@/modules/auth/types/user.types";
import { User } from "@/infrastructure/database/models/User";

class UserRepository {
  findById(id: string) {
    return User.findById(id);
  }

  findByIdWithPassword(id: string) {
    return User.findById(id).select("+password");
  }

  findByEmail(email: string) {
    return User.findOne({ email });
  }

  findByEmailWithPassword(email: string) {
    return User.findOne({ email }).select("+password");
  }

  findByEmailVerificationToken(hashedToken: string) {
    return User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });
  }

  findByResetToken(hashedToken: string) {
    return User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");
  }

  create(data: Record<string, unknown>) {
    return User.create(data);
  }

  save(user: IUser) {
    return user.save();
  }

  updatePasswordChangedAt(id: string) {
    return User.findByIdAndUpdate(id, { passwordChangedAt: new Date() });
  }
}

export default new UserRepository();
