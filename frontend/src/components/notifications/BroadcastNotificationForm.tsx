"use client";

import { useState, useRef } from "react";
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
import { Bell, Send, CheckCircle, AlertCircle, Upload, X } from "lucide-react";

export function BroadcastNotificationForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Title and message are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      await notificationService.broadcast({
        type: formData.type,
        title: formData.title,
        message: formData.message,
        actionUrl: formData.actionUrl || undefined,
        imageUrl: previewUrl || formData.image || undefined,
        priority: formData.priority,
      });

      setSuccess("Notification broadcast successfully to all users!");

      // Reset form
      setFormData({
        type: NotificationType.SYSTEM,
        title: "",
        message: "",
        actionUrl: "",
        image: "",
        priority: NotificationPriority.MEDIUM,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to broadcast notification"
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
          <Bell className="h-5 w-5 text-blue-600" />
          <CardTitle>Broadcast Notification</CardTitle>
        </div>
        <CardDescription>
          Send a notification to all users in the system
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
                <option value={NotificationType.SYSTEM}>System</option>
                <option value={NotificationType.PROMOTION}>Promotion</option>
                <option value={NotificationType.PRODUCT}>Product</option>
                <option value={NotificationType.ORDER}>Order</option>
                <option value={NotificationType.APPOINTMENT}>
                  Appointment
                </option>
                <option value={NotificationType.TREATMENT_ROUTINE}>
                  Treatment Routine
                </option>
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
              placeholder="e.g., System Maintenance Notice"
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
              placeholder="e.g., /promotions/sale"
              value={formData.actionUrl}
              onChange={(e) =>
                setFormData({ ...formData, actionUrl: e.target.value })
              }
              disabled={isSubmitting}
              className="bg-white border-slate-300"
            />
            <p className="text-xs text-slate-500">
              Where users will be redirected when they tap the notification
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
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Broadcasting..." : "Broadcast Notification"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
