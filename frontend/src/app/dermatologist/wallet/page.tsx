"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withdrawalService } from "@/services/withdrawalService";
import { authService } from "@/services/authService";
import type { WalletTransaction } from "@/types/withdrawal";
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

export default function DermatologistWalletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestingOTP, setRequestingOTP] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    otpCode: "",
    fullName: "",
    bankName: "",
    accountNumber: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchBanks();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await authService.checkAuth();
      if (
        !result.authenticated ||
        !result.user ||
        result.user.role !== "dermatologist"
      ) {
        router.push("/dermatologist/login");
        return;
      }
      setUser(result.user);
      fetchTransactions();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/dermatologist/login");
    }
  };

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      const response = await fetch("https://api.vietqr.io/v2/banks");
      const result = await response.json();
      if (result.code === "00" && result.data) {
        setBanks(result.data);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
      toast({
        title: "Warning",
        description:
          "Failed to load bank list. You can still enter bank name manually.",
        variant: "warning",
      });
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await withdrawalService.getWalletTransactions({
        page: 1,
        limit: 100,
      });
      setTransactions(response.data || []);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch wallet transactions";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!withdrawalForm.amount || parseFloat(withdrawalForm.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "error",
      });
      return;
    }

    try {
      setRequestingOTP(true);
      await withdrawalService.requestOTP({
        amount: parseFloat(withdrawalForm.amount),
      });
      setOtpSent(true);
      toast({
        title: "Success",
        description: "OTP has been sent to your email",
        variant: "success",
      });
    } catch (error: any) {
      console.error("OTP request error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to request OTP";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setRequestingOTP(false);
    }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpSent) {
      toast({
        title: "Error",
        description: "Please request OTP first",
        variant: "error",
      });
      return;
    }

    try {
      setSubmitting(true);
      await withdrawalService.createWithdrawal({
        otpCode: withdrawalForm.otpCode,
        fullName: withdrawalForm.fullName,
        amount: parseFloat(withdrawalForm.amount),
        type: "withdraw",
        bankName: withdrawalForm.bankName,
        accountNumber: withdrawalForm.accountNumber,
        notes: withdrawalForm.notes,
      });

      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
        variant: "success",
      });

      // Reset form
      setWithdrawalForm({
        amount: "",
        otpCode: "",
        fullName: "",
        bankName: "",
        accountNumber: "",
        notes: "",
      });
      setOtpSent(false);
      setShowWithdrawalForm(false);
      fetchTransactions();
    } catch (error: any) {
      console.error("Withdrawal submission error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit withdrawal request";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const isAppointmentSettlement = (transaction: WalletTransaction) =>
    transaction.paymentCode?.startsWith("SKWSTAPP");

  const handleTransactionClick = (transaction: WalletTransaction) => {
    if (!isAppointmentSettlement(transaction)) return;

    const appointmentId = transaction.transferContent;

    if (!appointmentId) {
      toast({
        title: "Appointment not found",
        description:
          "This settlement does not include an appointment reference.",
        variant: "warning",
      });
      return;
    }

    router.push(`/dermatologist/appointment/${appointmentId}`);
  };

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const displayType = isAppointmentSettlement(transaction)
      ? "settled"
      : transaction.paymentType;
    return (
      transaction.paymentCode.toLowerCase().includes(query) ||
      displayType.toLowerCase().includes(query) ||
      transaction.status.toLowerCase().includes(query) ||
      transaction.paymentMethod.toLowerCase().includes(query) ||
      transaction.transferContent?.toLowerCase().includes(query)
    );
  });

  const stats = {
    totalTopups: transactions
      .filter((t) => t.paymentType === "topup" && t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0),
    totalWithdrawals: transactions
      .filter((t) => t.paymentType === "withdraw")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0),
    pendingWithdrawals: transactions.filter(
      (t) => t.paymentType === "withdraw" && t.status === "pending"
    ).length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>
        <p className="text-slate-600 mt-1">
          Manage your earnings and withdrawal requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Balance
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(
                  (stats.totalTopups - stats.totalWithdrawals).toString()
                )}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Earnings
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.totalTopups.toString())}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-r from-green-400 to-green-500 rounded-lg">
              <ArrowDownCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Withdrawn
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(stats.totalWithdrawals.toString())}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-r from-red-400 to-red-500 rounded-lg">
              <ArrowUpCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Pending Withdrawals
              </p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {stats.pendingWithdrawals}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <Button
          onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Request Withdrawal
        </Button>
        <Button
          onClick={fetchTransactions}
          variant="outline"
          disabled={loading}
          className="border-slate-300"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Withdrawal Form */}
      {showWithdrawalForm && (
        <Card className="p-6 mb-6 bg-white border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Request Withdrawal
          </h2>
          <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (VND)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount (Min: 50,000 VND)"
                  value={withdrawalForm.amount}
                  onChange={(e) =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      amount: e.target.value,
                    })
                  }
                  required
                  className="border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter full name"
                  value={withdrawalForm.fullName}
                  onChange={(e) =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      fullName: e.target.value,
                    })
                  }
                  required
                  className="border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Select
                  value={withdrawalForm.bankName}
                  onValueChange={(value) =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      bankName: value,
                    })
                  }
                  required
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue
                      placeholder={
                        loadingBanks ? "Loading banks..." : "Select a bank"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingBanks ? (
                      <SelectItem value="loading" disabled>
                        Loading banks...
                      </SelectItem>
                    ) : banks.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        No banks available
                      </SelectItem>
                    ) : (
                      banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.name}>
                          <div className="flex items-center gap-2">
                            <img
                              src={bank.logo}
                              alt={bank.shortName}
                              className="w-6 h-6 object-contain"
                            />
                            <span>
                              {bank.shortName} - {bank.name}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  placeholder="Enter account number"
                  value={withdrawalForm.accountNumber}
                  onChange={(e) =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      accountNumber: e.target.value,
                    })
                  }
                  required
                  className="border-slate-300"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional notes"
                value={withdrawalForm.notes}
                onChange={(e) =>
                  setWithdrawalForm({
                    ...withdrawalForm,
                    notes: e.target.value,
                  })
                }
                className="border-slate-300"
              />
            </div>

            {!otpSent ? (
              <Button
                type="button"
                onClick={handleRequestOTP}
                disabled={requestingOTP}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {requestingOTP ? "Withdrawing..." : "Withdraw"}
              </Button>
            ) : (
              <>
                <div>
                  <Label htmlFor="otpCode">OTP Code</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    placeholder="Enter OTP sent to your email"
                    value={withdrawalForm.otpCode}
                    onChange={(e) =>
                      setWithdrawalForm({
                        ...withdrawalForm,
                        otpCode: e.target.value,
                      })
                    }
                    required
                    className="border-slate-300"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    {submitting ? "Submitting..." : "Submit Withdrawal Request"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={requestingOTP}
                    variant="outline"
                    className="border-slate-300"
                  >
                    {requestingOTP ? "Resending..." : "Resend OTP"}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Card>
      )}

      {/* Transactions Table */}
      <Card className="overflow-hidden bg-white border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Transaction History
            </h2>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by code, type, status, or method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-slate-300"
              />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No transactions yet</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">
              No transactions found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Payment Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTransactions.map((transaction) => {
                  const appointmentSettlement =
                    isAppointmentSettlement(transaction);
                  const appointmentId = appointmentSettlement
                    ? transaction.transferContent
                    : null;

                  return (
                    <tr
                      key={transaction.paymentId}
                      onClick={() => handleTransactionClick(transaction)}
                      className={`hover:bg-slate-50 transition-colors ${
                        appointmentSettlement ? "cursor-pointer" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-slate-900">
                          {transaction.paymentCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {appointmentSettlement ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-700">
                                Settled
                              </span>
                            </>
                          ) : transaction.paymentType === "topup" ? (
                            <>
                              <ArrowDownCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">
                                Top-up
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-600">
                                Withdrawal
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm capitalize text-slate-900">
                          {transaction.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          <span className="text-sm capitalize text-slate-900">
                            {transaction.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">
                          {formatDate(transaction.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
