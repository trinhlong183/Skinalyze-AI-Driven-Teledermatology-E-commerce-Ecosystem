/**
When making API calls, the responses often follow a standard structure. This interface defines that structure,
allowing for consistent typing of API responses throughout the application.
T the generic type T represents the shape of the actual data payload returned by the API.
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp?: string; 
}
