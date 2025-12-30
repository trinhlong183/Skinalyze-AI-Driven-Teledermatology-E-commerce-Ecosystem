"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { notificationService } from "@/services/notificationService";
import { NotificationType, NotificationPriority } from "@/types/notification";
import {
  User,
  Send,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  Search,
} from "lucide-react";
import { userService } from "@/services/userService";
import type { User as UserType } from "@/types/user";

export function SendToUserNotificationForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    userId: "",
    type: NotificationType.SYSTEM,
    title: "",
    message: "",
    actionUrl: "",
    image: "",
    priority: NotificationPriority.MEDIUM,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // User search state
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await userService.getUsers(1, 100); // Get first 100 users
      setUsers(response.users);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.role !== "admin" &&
      (user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.userId.toLowerCase().includes(query))
    );
  });

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
    setFormData({ ...formData, userId: user.userId });
    setSearchQuery(user.fullName);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.userId.trim() ||
      !formData.title.trim() ||
      !formData.message.trim()
    ) {
      setError("User ID, title, and message are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      await notificationService.sendToUser({
        userId: formData.userId,
        type: formData.type,
        title: formData.title,
        message: formData.message,
        actionUrl: formData.actionUrl || undefined,
        imageUrl: previewUrl || formData.image || undefined,
        priority: formData.priority,
      });

      setSuccess("Notification sent successfully to the user!");

      // Reset form
      setFormData({
        userId: "",
        type: NotificationType.SYSTEM,
        title: "",
        message: "",
        actionUrl: "",
        image: "",
        priority: NotificationPriority.MEDIUM,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedUser(null);
      setSearchQuery("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to send notification"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFormData({ ...formData, image: "" }); // Clear URL input when file is selected
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <CardTitle>Send to Specific User</CardTitle>
        </div>
        <CardDescription>
          Send a notification to a specific user by their user ID
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Alert */}
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-600">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User ID */}
          <div className="space-y-2">
            <Label htmlFor="userId">Select User *</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="userId"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  disabled={isSubmitting}
                  className="bg-white border-slate-300 pl-10"
                />
              </div>

              {/* Dropdown */}
              {showDropdown && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {isLoadingUsers ? (
                    <div className="p-3 text-sm text-slate-500 text-center">
                      Loading users...
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => handleUserSelect(user)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                            <img
                              src={user.photoUrl || ""}
                              alt={user.fullName}
                              className="h-8 w-8 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 truncate">
                              {user.fullName}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {user.email}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            {user.role}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected User Display */}
            {selectedUser && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                  <img
                    src={selectedUser.photoUrl || ""}
                    alt={selectedUser.fullName}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />{" "}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900">
                    {selectedUser.fullName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedUser.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setFormData({ ...formData, userId: "" });
                    setSearchQuery("");
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Search and select a user to send the notification to
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Notification Type *</Label>
              <select
                id="type"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as NotificationType,
                  })
                }
                required
              >
                <option value={NotificationType.ORDER}>Order</option>
                <option value={NotificationType.APPOINTMENT}>
                  Appointment
                </option>
                <option value={NotificationType.TREATMENT_ROUTINE}>
                  Treatment Routine
                </option>
                <option value={NotificationType.PRODUCT}>Product</option>
                <option value={NotificationType.SYSTEM}>System</option>
                <option value={NotificationType.PROMOTION}>Promotion</option>
                <option value={NotificationType.ANYTHING}>Anything</option>
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <select
                id="priority"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as NotificationPriority,
                  })
                }
                required
              >
                <option value={NotificationPriority.LOW}>Low</option>
                <option value={NotificationPriority.MEDIUM}>Medium</option>
                <option value={NotificationPriority.HIGH}>High</option>
                <option value={NotificationPriority.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Your Order Has Been Shipped"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              disabled={isSubmitting}
              className="bg-white border-slate-300"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Enter the notification message..."
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={4}
              required
              disabled={isSubmitting}
              className="bg-white border-slate-300"
            />
          </div>

          {/* Action URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="actionUrl">Action URL (Optional)</Label>
            <Input
              id="actionUrl"
              placeholder="e.g., /orders/12345"
              value={formData.actionUrl}
              onChange={(e) =>
                setFormData({ ...formData, actionUrl: e.target.value })
              }
              disabled={isSubmitting}
              className="bg-white border-slate-300"
            />
            <p className="text-xs text-slate-500">
              Where the user will be redirected when they tap the notification
            </p>
          </div>

          {/* Image URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image</Label>
            <div className="space-y-3">
              {/* Upload Button */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleImageClick}
                  disabled={isSubmitting}
                  className="flex-1 border-slate-300"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-32 w-auto rounded-lg border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Or use URL */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">
                    Or use URL
                  </span>
                </div>
              </div>

              <Input
                id="imageUrl"
                placeholder="e.g., https://example.com/image.jpg"
                value={formData.image}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
                disabled={isSubmitting || !!previewUrl}
                className="bg-white border-slate-300"
              />
            </div>
            <p className="text-xs text-slate-500">
              Upload an image or provide a URL (max 5MB)
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send Notification"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
