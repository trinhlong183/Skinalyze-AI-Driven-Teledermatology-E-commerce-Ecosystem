import { http } from "@/lib/http";
import type { Customer } from "@/types/customer";
import type { ApiResponse } from "@/types/api";

class CustomerService {
  async getCustomer(customerId: string): Promise<Customer> {
    const response = await http.get<ApiResponse<Customer>>(
      `/api/customers/${customerId}`
    );
    return response.data;
  }
}

export const customerService = new CustomerService();
