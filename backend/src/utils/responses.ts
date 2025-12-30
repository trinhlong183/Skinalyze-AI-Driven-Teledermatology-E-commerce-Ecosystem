import { ApiProperty } from '@nestjs/swagger';

/**
 * Base response wrapper for all API responses
 */
export class ApiResponse<T = any> {
  @ApiProperty({
    description: 'Status code of the response',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Message describing the response',
    example: 'Operation successful',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2025-10-03T10:30:00.000Z',
  })
  timestamp: string;

  constructor(statusCode: number, message: string, data?: T) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Success response wrapper
 */
export class SuccessResponse<T = any> extends ApiResponse<T> {
  constructor(message: string = 'Operation successful', data?: T) {
    super(200, message, data);
  }
}

/**
 * Created response wrapper
 */
export class CreatedResponse<T = any> extends ApiResponse<T> {
  constructor(message: string = 'Resource created successfully', data?: T) {
    super(201, message, data);
  }
}

/**
 * Error response wrapper
 */
export class ErrorResponse extends ApiResponse {
  @ApiProperty({
    description: 'Error details or validation errors',
    required: false,
    example: { field: 'email', message: 'Invalid email format' },
  })
  errors?: any;

  constructor(statusCode: number, message: string, errors?: any) {
    super(statusCode, message);
    this.errors = errors;
  }
}

/**
 * Paginated response wrapper
 */
export class PaginatedResponse<T = any> {
  @ApiProperty({
    description: 'Status code of the response',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Message describing the response',
    example: 'Data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of data items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      total: {
        type: 'number',
        example: 100,
        description: 'Total number of items',
      },
      page: {
        type: 'number',
        example: 1,
        description: 'Current page number',
      },
      limit: {
        type: 'number',
        example: 10,
        description: 'Number of items per page',
      },
      totalPages: {
        type: 'number',
        example: 10,
        description: 'Total number of pages',
      },
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2025-10-03T10:30:00.000Z',
  })
  timestamp: string;

  constructor(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Data retrieved successfully',
  ) {
    this.statusCode = 200;
    this.message = message;
    this.data = data;
    this.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Helper functions to create responses
 */
export const ResponseHelper = {
  success: <T>(message: string = 'Operation successful', data?: T) => {
    return new SuccessResponse(message, data);
  },

  created: <T>(message: string = 'Resource created successfully', data?: T) => {
    return new CreatedResponse(message, data);
  },

  error: (statusCode: number, message: string, errors?: any) => {
    return new ErrorResponse(statusCode, message, errors);
  },

  paginated: <T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
  ) => {
    return new PaginatedResponse(data, total, page, limit, message);
  },

  badRequest: (message: string = 'Bad request', errors?: any) => {
    return new ErrorResponse(400, message, errors);
  },

  unauthorized: (message: string = 'Unauthorized access') => {
    return new ErrorResponse(401, message);
  },

  forbidden: (message: string = 'Forbidden resource') => {
    return new ErrorResponse(403, message);
  },

  notFound: (message: string = 'Resource not found') => {
    return new ErrorResponse(404, message);
  },

  conflict: (message: string = 'Resource conflict', errors?: any) => {
    return new ErrorResponse(409, message, errors);
  },

  internalError: (message: string = 'Internal server error', errors?: any) => {
    return new ErrorResponse(500, message, errors);
  },
};

export class ResponseHelperUtil {
  static success(message: string, data?: any) {
    return {
      success: true,
      message,
      data,
    };
  }

  static created(message: string, data?: any) {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message: string, error?: any) {
    return {
      success: false,
      message,
      error,
    };
  }
}
