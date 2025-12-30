"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CosmicBackground from "@/components/shared/CosmicBackground";
import CustomCursor from "@/components/ui/CustomCursor";

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setStatus("error");
      setMessage("No verification token provided");
      setShowResendModal(true);
    }
  }, [token]);

  const verifyToken = async (token: string) => {
    try {
      setStatus("loading");
      const result = await authService.verifyEmail(token);
      setStatus("success");
      setMessage(
        result.message || "Your email has been verified successfully!"
      );

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Email verification failed"
      );
      setShowResendModal(true);
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resendEmail) return;

    try {
      setIsResending(true);
      const result = await authService.resendVerification(resendEmail);
      setResendSuccess(true);
      setMessage(result.message || "Verification email sent successfully!");

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowResendModal(false);
        setResendSuccess(false);
        setResendEmail("");
      }, 2000);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to resend verification email"
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center text-white overflow-hidden bg-[#0a0e1a]"
      style={{ cursor: "none" }}
    >
      <CustomCursor />

      <div className="fixed inset-0 z-0">
        <CosmicBackground />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 rounded-3xl border border-white/10 backdrop-blur-xl"
        >
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block"
            >
              <div className="text-4xl font-black gradient-text mb-2">
                SKINALYZE
              </div>
            </motion.div>
            <p className="text-gray-400 text-sm">Email Verification</p>
          </div>

          {/* Status Display */}
          <div className="flex flex-col items-center justify-center py-8">
            {status === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <Loader2 className="h-16 w-16 animate-spin text-emerald-400 mx-auto mb-4" />
                <p className="text-lg font-medium">Verifying your email...</p>
                <p className="text-sm text-gray-400 mt-2">
                  Please wait a moment
                </p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mb-4"
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-3">Email Verified!</h2>
                <p className="text-gray-300 mb-4">{message}</p>
                <p className="text-sm text-gray-400">
                  Redirecting to login page...
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => router.push("/login")}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Go to Login <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400 mb-4"
                >
                  <XCircle className="h-10 w-10 text-red-400" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-3">Verification Failed</h2>
                <p className="text-gray-300 mb-6">{message}</p>
                <Button
                  onClick={() => setShowResendModal(true)}
                  variant="outline"
                  className="border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </Button>
              </motion.div>
            )}
          </div>

          {/* Back to Home Link */}
          <div className="text-center mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>

      {/* Resend Verification Modal */}
      <Dialog open={showResendModal} onOpenChange={setShowResendModal}>
        <DialogContent className="bg-[#0a0e1a] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold gradient-text">
              Resend Verification Email
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your email address to receive a new verification link.
            </DialogDescription>
          </DialogHeader>

          {resendSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-6"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
              <p className="text-emerald-400 font-medium">
                Email sent successfully!
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Please check your inbox
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleResendVerification}
              className="space-y-4 mt-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-400"
                />
              </div>

              <Button
                type="submit"
                disabled={isResending || !resendEmail}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Email
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
