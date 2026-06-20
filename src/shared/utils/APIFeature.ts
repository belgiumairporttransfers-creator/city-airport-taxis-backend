import { Model, Document, FilterQuery, Query } from "mongoose";
import { PAGINATION } from "@/shared/constants/pagination";
import { escapeRegex } from "@/shared/utils/escape-regex";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

export interface SortOptions {
  sort?: string;
  defaultSort?: string;
  allowedFields?: string[];
}

export interface DateRangeFilter {
  field: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface SearchOptions {
  search?: string;
  searchFields?: string[];
}

export interface PopulateOptions {
  path: string;
  select?: string;
}

export interface APIFeatureOptions {
  pagination?: PaginationOptions;
  sort?: SortOptions;
  dateRange?: DateRangeFilter;
  search?: SearchOptions;
  populate?: PopulateOptions | PopulateOptions[];
  select?: string;
  excludeFields?: string[];
  filterFields?: string[];
  disablePagination?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

class APIFeature<T extends Document> {
  private query: Query<T[], T>;
  private queryString: Record<string, any>;
  private filterQuery: FilterQuery<T> = {};
  private defaultLimit: number;
  private maxLimit: number;
  private options?: APIFeatureOptions;

  constructor(model: Model<T>, queryString: Record<string, any>, options?: APIFeatureOptions) {
    this.queryString = queryString;
    this.query = model.find();
    this.defaultLimit = options?.pagination?.defaultLimit || PAGINATION.DEFAULT_LIMIT;
    this.maxLimit = options?.pagination?.maxLimit || PAGINATION.MAX_LIMIT;
    this.options = options;

    // Automatically apply all options
    this.applyOptions();
  }

  /**
   * Automatically apply all options from constructor
   */
  private applyOptions(): void {
    if (!this.options) return;

    // Apply filter fields
    if (this.options.filterFields && this.options.filterFields.length > 0) {
      this.filter(this.options.filterFields);
    }

    // Apply date range filter
    if (this.options.dateRange) {
      this.dateRange(
        this.options.dateRange.field,
        this.options.dateRange.startDate,
        this.options.dateRange.endDate
      );
    }

    // Apply search
    if (this.options.search) {
      const searchFields = this.options.search.searchFields || [];
      const searchTerm = this.options.search.search || this.queryString.search;
      if (searchFields.length > 0) {
        this.search(searchFields, searchTerm);
      }
    }

    if (this.options.sort) {
      const defaultSort = this.options.sort.defaultSort || this.options.sort.sort || "-createdAt";
      this.sort(defaultSort);
    }

    if (this.options.populate) {
      if (Array.isArray(this.options.populate)) {
        this.populateMany(this.options.populate);
      } else {
        this.populate(this.options.populate.path, this.options.populate.select);
      }
    }

    if (this.options.select) {
      this.query = this.query.select(this.options.select);
    }

    if (this.options.excludeFields && this.options.excludeFields.length > 0) {
      this.excludeFields(this.options.excludeFields);
    }
    if (!this.options.disablePagination) {
      this.paginate();
    }
  }

  filter(fields?: string[]): this {
    const filterFields = fields || Object.keys(this.queryString);
    const excludedFields = ["page", "limit", "sort", "search", "startDate", "endDate", "fields"];

    filterFields.forEach((field) => {
      if (excludedFields.includes(field)) return;

      const value = this.queryString[field];
      if (value !== undefined && value !== null && value !== "") {
        // Handle ObjectId fields
        if (this.isValidObjectId(value)) {
          this.filterQuery[field as keyof FilterQuery<T>] = value as any;
        }
        // Handle boolean strings
        else if (value === "true" || value === "false") {
          this.filterQuery[field as keyof FilterQuery<T>] = (value === "true") as any;
        }
        // Handle array values (comma-separated)
        else if (typeof value === "string" && value.includes(",")) {
          this.filterQuery[field as keyof FilterQuery<T>] = {
            $in: value.split(","),
          } as any;
        }
        // Regular field match
        else {
          this.filterQuery[field as keyof FilterQuery<T>] = value as any;
        }
      }
    });

    this.query = this.query.find(this.filterQuery);
    return this;
  }

  /**
   * Filter by date range
   * Example: ?startDate=2024-01-01&endDate=2024-12-31
   */
  dateRange(field: string, startDate?: string | Date, endDate?: string | Date): this {
    const start = startDate || this.queryString.startDate;
    const end = endDate || this.queryString.endDate;

    if (start || end) {
      const dateFilter: any = {};
      if (start) {
        dateFilter.$gte = new Date(start);
      }
      if (end) {
        dateFilter.$lte = new Date(end);
      }
      this.filterQuery[field as keyof FilterQuery<T>] = dateFilter as any;
      this.query = this.query.find(this.filterQuery);
    }

    return this;
  }

  /**
   * Search across multiple fields using regex
   * Example: ?search=john
   */
  search(searchFields: string[], searchTerm?: string): this {
    const search = searchTerm || this.queryString.search;

    if (search && searchFields.length > 0) {
      const searchRegex = { $regex: escapeRegex(search), $options: "i" };
      const orConditions = searchFields.map((field) => ({
        [field]: searchRegex,
      }));

      // If filterQuery already has $or, merge conditions
      if (this.filterQuery.$or) {
        this.filterQuery.$or = [...(this.filterQuery.$or as any[]), ...orConditions];
      } else {
        this.filterQuery.$or = orConditions as any;
      }

      this.query = this.query.find(this.filterQuery);
    }

    return this;
  }

  /**
   * Sort results
   * Example: ?sort=-createdAt (descending) or ?sort=createdAt (ascending)
   * Default: -createdAt (newest first)
   */
  sort(defaultSort: string = "-createdAt"): this {
    const sortBy = this.queryString.sort || defaultSort;
    const allowedFields = this.options?.sort?.allowedFields;
    const sortFields = sortBy
      .split(",")
      .map((field: string) => {
        const descending = field.startsWith("-");
        const fieldName = descending ? field.substring(1) : field;

        if (allowedFields && !allowedFields.includes(fieldName)) {
          return null;
        }

        return [fieldName, descending ? -1 : 1] as [string, 1 | -1];
      })
      .filter(Boolean) as [string, 1 | -1][];

    if (sortFields.length > 0) {
      this.query = this.query.sort(sortFields);
    } else {
      const fallback = defaultSort.startsWith("-")
        ? [defaultSort.substring(1), -1]
        : [defaultSort, 1];
      this.query = this.query.sort([fallback as [string, 1 | -1]]);
    }

    return this;
  }

  /**
   * Limit fields returned
   * Example: ?fields=name,email,phone
   */
  limitFields(): this {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    }
    return this;
  }

  /**
   * Exclude specific fields
   */
  excludeFields(fields: string[]): this {
    const fieldsToExclude = fields.map((field) => `-${field}`).join(" ");
    this.query = this.query.select(fieldsToExclude);
    return this;
  }

  /**
   * Populate referenced documents
   * Example: populate("driverId", "name email phone")
   */
  populate(path: string, select?: string): this {
    this.query = this.query.populate(path, select);
    return this;
  }

  /**
   * Populate multiple references
   */
  populateMany(populateOptions: PopulateOptions[]): this {
    populateOptions.forEach((option) => {
      this.query = this.query.populate(option.path, option.select);
    });
    return this;
  }

  /**
   * Apply pagination
   * Example: ?page=1&limit=10
   */
  paginate(): this {
    const page = parseInt(this.queryString.page) || 1;
    const limit = Math.min(parseInt(this.queryString.limit) || this.defaultLimit, this.maxLimit);
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  /**
   * Execute query and return paginated results
   */
  async execute(): Promise<PaginatedResult<T>> {
    const page = parseInt(this.queryString.page) || 1;
    const limit = Math.min(parseInt(this.queryString.limit) || this.defaultLimit, this.maxLimit);

    // Clone the query for counting
    const countQuery = this.query.model.find(this.filterQuery);
    const [data, total] = await Promise.all([this.query.exec(), countQuery.countDocuments()]);

    const pages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Execute query without pagination (returns all matching documents)
   */
  async executeAll(): Promise<T[]> {
    return this.query.exec();
  }

  /**
   * Get the current filter object
   */
  getFilter(): FilterQuery<T> {
    return this.filterQuery;
  }

  /**
   * Get the current query (for advanced use cases)
   */
  getQuery(): Query<T[], T> {
    return this.query;
  }

  /**
   * Add custom filter condition
   */
  addFilter(condition: FilterQuery<T>): this {
    this.filterQuery = { ...this.filterQuery, ...condition };
    this.query = this.query.find(this.filterQuery);
    return this;
  }

  /**
   * Check if string is a valid MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}

export default APIFeature;
