export interface UploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

export interface UploadOptions {
  folder?: string;
  resource_type?: "image" | "video" | "raw" | "auto";
  transformation?: any[];
  public_id?: string;
  overwrite?: boolean;
  invalidate?: boolean;
}

export interface UploadImageResponse {
  url: string;
  public_id: string;
}
