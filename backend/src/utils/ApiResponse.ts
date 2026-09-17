export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public message: string,
    public data: T | null = null,
    public errors: any = null,
  ) {}

  static ok<T>(data: T, message = 'Success') {
    return new ApiResponse(true, message, data);
  }
  static created<T>(data: T, message = 'Created') {
    return new ApiResponse(true, message, data);
  }
  static fail(message = 'Failed', errors: any = null) {
    return new ApiResponse(false, message, null, errors);
  }
}