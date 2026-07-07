import type { Document } from "mongoose";

export interface IContact extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface GetContactsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface BulkDeleteContactsData {
  ids: string[];
}
