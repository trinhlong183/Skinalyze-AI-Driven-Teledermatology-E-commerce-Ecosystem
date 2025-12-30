"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserFormModal } from "@/components/users/UserFormModal";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import type { User, CreateUserRequest, UpdateUserRequest } from "@/types/user";
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  Shield,
  Briefcase,
  UserCircle,
  Stethoscope,
  Key,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetPasswordConfirmOpen, setResetPasswordConfirmOpen] =
    useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(
    null
  );

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await userService.getUsers(page, 10);
      setUsers(response.users);
      setTotalPages(Math.ceil(response.total / response.limit));
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to load users. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { authenticated, user } = await authService.checkAuth();
        if (authenticated && user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    
    getCurrentUser();
    fetchUsers();
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      toast({
        variant: "success",
        title: "Success",
        description: "User deleted successfully.",
      });
      fetchUsers(currentPage);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to delete user. Please try again.",
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const result = await userService.resetPassword(userId);
      toast({
        variant: "success",
        title: "Password Reset Successful",
        description: "The user's password has been reset successfully.",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to reset password. Please try again.",
      });
    }
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const confirmResetPassword = (user: User) => {
    setUserToResetPassword(user);
    setResetPasswordConfirmOpen(true);
  };

  const handleSubmit = async (data: CreateUserRequest | UpdateUserRequest) => {
    try {
      if (modalMode === "create") {
        await userService.createUser(data as CreateUserRequest);
        toast({
          variant: "success",
          title: "Success",
          description: "User created successfully.",
        });
      } else if (selectedUser) {
        await userService.updateUser(selectedUser.userId, data);
        toast({
          variant: "success",
          title: "Success",
          description: "User updated successfully.",
        });
      }
      fetchUsers(currentPage);
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        variant: "error",
        title: "Error",
        description: `Failed to ${
          modalMode === "create" ? "create" : "update"
        } user. Please try again.`,
      });
      throw error;
    }
  };

  const filteredUsers = (users || [])
    .filter((user) => {
      // Hide the current user
      if (currentUser && user.userId === currentUser.userId) {
        return false;
      }
      // Hide all admin users
      if (user.role === 'admin') {
        return false;
      }
      // Apply search filter
      return (
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

  const visibleUsers = (users || []).filter((user) => {
    // Hide the current user
    if (currentUser && user.userId === currentUser.userId) {
      return false;
    }
    // Hide all admin users
    if (user.role === 'admin') {
      return false;
    }
    return true;
  });

  const stats = {
    total: visibleUsers.length,
    active: visibleUsers.filter((u) => u.isActive).length,
    admins: 0, // Don't show admin count since we're hiding them
    staff: visibleUsers.filter((u) => u.role === "staff").length,
    dermatologists: visibleUsers.filter((u) => u.role === "dermatologist").length,
    customers: visibleUsers.filter((u) => u.role === "customer").length,
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-green-500/10 text-green-700 border border-green-200";
      case "staff":
        return "bg-blue-500/10 text-blue-700 border border-blue-200";
      case "dermatologist":
        return "bg-purple-500/10 text-purple-700 border border-purple-200";
      default:
        return "bg-slate-500/10 text-slate-700 border border-slate-200";
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              User Management
            </h1>
            <p className="text-slate-600 mt-1">
              Manage system users and their roles
            </p>
          </div>
          <Button
            onClick={handleAddUser}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.total}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.active}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Staff</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.staff}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Stethoscope className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Dermatologists</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.dermatologists}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <UserCircle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Customers</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.customers}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-6 bg-white border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-300 text-slate-900 focus:border-green-500"
            />
          </div>
        </Card>

        {/* Users Table */}
        <Card className="bg-white border-slate-200">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.userId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {user.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600">
                          {user.phone || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-black-600 hover:text-black-700 transition-colors"
                            title="Edit User"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmResetPassword(user)}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDeleteUser(user)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">
                    No users found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {searchTerm
                      ? "Try adjusting your search"
                      : "Get started by creating a new user"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fetchUsers(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchUsers(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* User Form Modal */}
        <UserFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          user={selectedUser}
          mode={modalMode}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Delete User"
          description={`Are you sure you want to delete ${
            userToDelete?.fullName || "this user"
          }? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() =>
            userToDelete && handleDeleteUser(userToDelete.userId)
          }
        />

        {/* Reset Password Confirmation Dialog */}
        <ConfirmDialog
          open={resetPasswordConfirmOpen}
          onOpenChange={setResetPasswordConfirmOpen}
          title="Reset Password"
          description={`Are you sure you want to reset the password for ${userToResetPassword?.email}? A new temporary password will be generated.`}
          confirmLabel="Reset Password"
          cancelLabel="Cancel"
          variant="default"
          onConfirm={() =>
            userToResetPassword &&
            handleResetPassword(userToResetPassword.userId)
          }
        />
      </div>
    </AdminLayout>
  );
}
