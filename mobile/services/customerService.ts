import { ApiResponse } from "@/types/api";
import apiService from "./apiService";
import { Customer } from "@/types/customer.type";

class CustomerService {
  async getCustomerProfile(userId: string): Promise<Customer> {
    try {
      const response = await apiService.get<ApiResponse<Customer>>(
        `/customers/user/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching customer profile:", error);
      throw error;
    }
  }
}

export default new CustomerService();
