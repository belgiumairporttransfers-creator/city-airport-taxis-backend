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
  initialFilter?: FilterQuery<Document>;
  disablePagination?: boolean;
  lean?: boolean;
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
  private queryString: Record<string, unknown>;
  private filterQuery: FilterQuery<T> = {};
  private defaultLimit: number;
  private maxLimit: number;
  private options?: APIFeatureOptions;

  constructor(model: Model<T>, queryString: object, options?: APIFeatureOptions) {
    this.queryString = queryString as Record<string, unknown>;
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

    if (this.options.initialFilter) {
      Object.assign(this.filterQuery, this.options.initialFilter);
      this.query = this.query.find(this.filterQuery);
    }

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
      const searchTerm = this.options.search.search || this.getQueryString("search");
      if (searchFields.length > 0 && searchTerm) {
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
    if (this.options.lean) {
      this.query = this.query.lean() as Query<T[], T>;
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
        if (typeof value === "string" && this.isValidObjectId(value)) {
          this.setFilterField(field, value);
        } else if (value === "true" || value === "false") {
          this.setFilterField(field, value === "true");
        } else if (typeof value === "string" && value.includes(",")) {
          this.setFilterField(field, { $in: value.split(",") });
        } else {
          this.setFilterField(field, value);
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
    const start = startDate ?? this.getQueryString("startDate");
    const end = endDate ?? this.getQueryString("endDate");

    if (start || end) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (start) {
        dateFilter.$gte = new Date(start);
      }
      if (end) {
        dateFilter.$lte = new Date(end);
      }
      this.setFilterField(field, dateFilter);
      this.query = this.query.find(this.filterQuery);
    }

    return this;
  }

  /**
   * Search across multiple fields using regex
   * Example: ?search=john
   */
  search(searchFields: string[], searchTerm?: string): this {
    const search = searchTerm || this.getQueryString("search");

    if (search && searchFields.length > 0) {
      const searchRegex = { $regex: escapeRegex(search), $options: "i" };
      const orConditions = searchFields.map((field) => ({
        [field]: searchRegex,
      }));

      if (this.filterQuery.$or) {
        const existingOr = Array.isArray(this.filterQuery.$or) ? this.filterQuery.$or : [];
        this.filterQuery.$or = [...existingOr, ...orConditions] as FilterQuery<T>["$or"];
      } else {
        this.filterQuery.$or = orConditions as FilterQuery<T>["$or"];
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
    const sortBy = this.getQueryString("sort") || defaultSort;
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
    const fieldsValue = this.getQueryString("fields");
    if (fieldsValue) {
      const fields = fieldsValue.split(",").join(" ");
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
    const page = parseInt(this.getQueryString("page") ?? "1", 10) || 1;
    const limit = Math.min(
      parseInt(this.getQueryString("limit") ?? String(this.defaultLimit), 10) || this.defaultLimit,
      this.maxLimit
    );
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  /**
   * Execute query and return paginated results
   */
  async execute(): Promise<PaginatedResult<T>> {
    const page = parseInt(this.getQueryString("page") ?? "1", 10) || 1;
    const limit = Math.min(
      parseInt(this.getQueryString("limit") ?? String(this.defaultLimit), 10) || this.defaultLimit,
      this.maxLimit
    );

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

  private getQueryString(key: string): string | undefined {
    const value = this.queryString[key];
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return undefined;
  }

  private setFilterField(field: string, value: unknown): void {
    (this.filterQuery as Record<string, unknown>)[field] = value;
  }
}

export default APIFeature;
