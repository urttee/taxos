"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  MessageSquare,
  Scale,
  Store,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coins,
  Calendar,
  Calculator,
  ArrowLeft,
  Video,
  Phone,
  MoreVertical,
  Paperclip,
  Send,
  Image as ImageIcon,
  Printer,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileText
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { CATEGORIES } from "@/lib/constants";
import AccountingLedger from "@/components/AccountingLedger";

export default function TaxOSDashboard() {
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookkeeping" | "tax" | "whatsapp" | "knowledge" | "ledger">("dashboard");

  // Global State fetched from API
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(2026);

  // Filter State for Bookkeeping
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  // Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isPlModalOpen, setIsPlModalOpen] = useState(false);

  // New Transaction Form State
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txCategory, setTxCategory] = useState("Penjualan");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");

  // Business Profile Settings Form State
  const [setBizName, setSetBizName] = useState("");
  const [setBizType, setSetBizType] = useState("");

  // OCR Modal Type
  const [ocrType, setOcrType] = useState("coffee_shop");

  // WhatsApp Assistant State
  const [waMessages, setWaMessages] = useState<any[]>([
    {
      id: 1,
      sender: "system",
      text: "Halo! Saya asisten TaxOS Anda. Ketikkan pengeluaran atau pemasukan Anda secara alami di sini.\n\nContoh:\n*\"Catat pemasukan catering siang 2,5 juta\"*\n\natau upload nota/invoice melalui tombol klip di bawah.",
      time: "10:08",
      type: "incoming"
    }
  ]);
  const [waInputText, setWaInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const waChatEndRef = useRef<HTMLDivElement>(null);

  // Regulations search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any[]>([]);
  const [searchingRegs, setSearchingRegs] = useState(false);

  // Simulation Calculator State
  const [simTurnover, setSimTurnover] = useState("");
  const [simBizType, setSimBizType] = useState("Orang Pribadi");
  const [simResult, setSimResult] = useState<any>(null);

  // Tax Payment State
  const [payMonth, setPayMonth] = useState("01");

  // Currency Formatter
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/stats?year=${currentYear}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
        setSetBizName(data.business_name || "");
        setSetBizType(data.business_type || "Orang Pribadi");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions List (for Bookkeeping Tab)
  const fetchTransactions = async () => {
    try {
      let url = `/api/transactions?`;
      if (filterType) url += `type=${filterType}&`;
      if (filterCategory) url += `category=${filterCategory}&`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [currentYear]);

  useEffect(() => {
    if (activeTab === "bookkeeping") {
      fetchTransactions();
    }
  }, [activeTab, filterType, filterCategory]);

  useEffect(() => {
    // Scroll WA chat to bottom
    waChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [waMessages]);

  // Handle Form Category sync
  useEffect(() => {
    if (txType === "income") {
      setTxCategory("Penjualan");
    } else {
      setTxCategory("Bahan Baku");
    }
  }, [txType]);

  // Load Initial Regulations list on tab switch
  useEffect(() => {
    if (activeTab === "knowledge" && searchQuery === "") {
      handleRegSearch("");
    }
  }, [activeTab]);

  // Manual Transaction Add
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txDesc) return;
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: txDate,
          type: txType,
          category: txCategory,
          amount: parseFloat(txAmount),
          description: txDesc,
          source: "manual"
        })
      });
      if (res.ok) {
        setIsTxModalOpen(false);
        setTxAmount("");
        setTxDesc("");
        // Reload statistics
        fetchDashboardStats();
        if (activeTab === "bookkeeping") fetchTransactions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDashboardStats();
        fetchTransactions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save settings
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: setBizName,
          business_type: setBizType
        })
      });
      if (res.ok) {
        setIsSettingsModalOpen(false);
        fetchDashboardStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // WhatsApp Chat Simulator Send
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || waInputText;
    if (!text.trim() || sendingMessage) return;

    if (!textToSend) setWaInputText("");

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Add user message
    const userMsgId = Date.now();
    setWaMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text,
        time: timeStr,
        type: "outgoing"
      }
    ]);

    setSendingMessage(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (res.ok) {
        setWaMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "system",
            text: data.response,
            time: timeStr,
            type: "incoming"
          }
        ]);
        // Refresh dashboard stats in background
        fetchDashboardStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMessage(false);
    }
  };

  // WhatsApp Template helper
  const sendWhatsAppTemplate = (text: string) => {
    setActiveTab("whatsapp");
    handleSendMessage(text);
  };

  // Simulate OCR send
  const handleSendOcr = async () => {
    setIsOcrModalOpen(false);
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Show upload simulation message
    const text = `[📸 Mengirim berkas nota: ${ocrType === "coffee_shop" ? "Bahan Baku Coffee Shop" : ocrType === "tokopedia_invoice" ? "Printer Thermal" : "POS Moka POS"}]`;
    setWaMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "user",
        text,
        time: timeStr,
        type: "outgoing"
      }
    ]);

    setSendingMessage(true);

    try {
      const res = await fetch("/api/chat/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_type: ocrType })
      });
      const data = await res.json();
      if (res.ok) {
        setWaMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "system",
            text: data.response,
            time: timeStr,
            type: "incoming"
          }
        ]);
        fetchDashboardStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMessage(false);
    }
  };

  // Tax Simulation Run
  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTurnover) return;
    try {
      const res = await fetch("/api/tax/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_turnover: parseFloat(simTurnover),
          business_type: simBizType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Pay monthly tax (Simulate)
  const handlePayTax = async () => {
    if (!stats || !stats.tax) return;
    const taxMonth = stats.tax.months.find((m: any) => m.month_code === payMonth);
    const amountToPay = taxMonth ? taxMonth.tax_due - taxMonth.tax_paid : 0;

    if (amountToPay <= 0) {
      alert("Tidak ada tunggakan pajak yang harus dibayar pada bulan ini.");
      return;
    }

    try {
      const res = await fetch("/api/tax/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_code: payMonth,
          amount: amountToPay
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchDashboardStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Search regulations (RAG)
  const handleRegSearch = async (q: string) => {
    setSearchingRegs(true);
    try {
      const url = q.trim() ? `/api/regulations/search?q=${encodeURIComponent(q)}` : `/api/regulations`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setSearchResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingRegs(false);
    }
  };

  // Helper radial health color
  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/20";
    if (score >= 50) return "text-amber-500 border-amber-500/20";
    return "text-red-500 border-red-500/20";
  };

  const getHealthDotColor = (level: string) => {
    if (level === "Sangat Sehat") return "bg-emerald-500 shadow-emerald-500/50";
    if (level === "Cukup Sehat") return "bg-amber-500 shadow-amber-500/50";
    if (level === "Kurang Sehat") return "bg-red-500 shadow-red-500/50";
    return "bg-slate-400";
  };

  // ----------------- RENDER PREPARATION -----------------
  // Cashflow chart data processing
  const cashflowChartData = stats
    ? Object.keys(stats.financials.monthly_chart)
        .sort()
        .map((mCode) => {
          const mNamesShort: Record<string, string> = {
            "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "Mei", "06": "Jun",
            "07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des"
          };
          const raw = stats.financials.monthly_chart[mCode];
          return {
            name: mNamesShort[mCode],
            Pemasukan: raw.income,
            Pengeluaran: raw.expense
          };
        })
    : [];

  // Pie chart data processing
  const expensePieData = stats
    ? Object.keys(stats.financials.expense_breakdown)
        .map((cat) => ({
          name: cat,
          value: stats.financials.expense_breakdown[cat]
        }))
        .filter((item) => item.value > 0)
    : [];

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#64748b"];

  const currentMonthCode = new Date().toISOString().slice(5, 7);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col shrink-0">
        <div 
          onClick={() => setActiveTab("dashboard")}
          className="p-6 flex flex-col items-start border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-lg text-slate-950 shadow-lg shadow-emerald-500/20">
              <Scale size={20} className="stroke-[2.5]" />
            </span>
            <span className="text-2xl font-bold font-display tracking-tight text-white">
              Tax<span className="text-emerald-400 font-extrabold">OS</span>
            </span>
          </div>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mt-1">Indonesia</span>
        </div>

        {/* Business Profile Card */}
        <div
          onClick={() => setIsSettingsModalOpen(true)}
          className="mx-4 my-6 p-4 rounded-xl glass-hover glass cursor-pointer flex items-center justify-between transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
              <Store size={20} />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-semibold text-white truncate max-w-[120px]">{stats?.business_name || "Warung Makan..."}</h4>
              <p className="text-[11px] text-slate-400 font-medium">{stats?.business_type || "Orang Pribadi"}</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-500" />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === "dashboard" ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("bookkeeping")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === "bookkeeping" ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <BookOpen size={18} />
            <span>Pencatatan Keuangan</span>
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === "ledger" ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Calculator size={18} />
            <span>Buku Besar (Akuntansi)</span>
          </button>
          <button
            onClick={() => setActiveTab("tax")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === "tax" ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FileSpreadsheet size={18} />
            <span>Asisten Pajak</span>
          </button>
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === "whatsapp" ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <MessageSquare size={18} />
            <span>Asisten Chat (AI)</span>
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === "knowledge" ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Scale size={18} />
            <span>Regulasi RAG</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 text-center flex flex-col items-center">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">TaxOS Indonesia v1.1.0</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[11px] text-emerald-400 font-semibold">Sistem Siap</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-20 shrink-0 border-b border-white/5 px-8 flex items-center justify-between glass">
          <div>
            <h1 className="text-xl font-bold text-white font-display">
              Selamat Pagi, {stats?.business_name || "Warung Makan Berkah"}!
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Kamis, 11 Juni 2026</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Health badge */}
            {stats && (
              <div className="relative group cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-white/5">
                <span className={`w-2 h-2 rounded-full ${getHealthDotColor(stats.health.level)}`}></span>
                <span className="text-xs font-semibold text-slate-300">Kesehatan: {stats.health.score}%</span>
                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-xl glass shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 z-50">
                  <h4 className="font-semibold text-white text-sm mb-1">Skor Kesehatan Bisnis</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{stats.health.description}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all duration-200"
            >
              <Plus size={16} className="stroke-[3]" /> Transaksi Baru
            </button>
          </div>
        </header>

        {/* Dynamic Tab Views container */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center flex-col gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
              <p className="text-sm text-slate-400 font-semibold">Memuat data ekosistem...</p>
            </div>
          ) : (
            <>
              {/* 1. DASHBOARD TAB */}
              {activeTab === "dashboard" && stats && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Top Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-6 rounded-2xl glass flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">Omzet Bulanan (2026)</span>
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><TrendingUp size={16} /></div>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white mt-4 tracking-tight">
                        {formatIDR(stats.financials.total_income)}
                      </h2>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-4 border-t border-white/5">
                        <span>Total Pendapatan Kotor</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 font-semibold">{stats.financials.transaction_count} transaksi</span>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl glass flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Pengeluaran</span>
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><TrendingDown size={16} /></div>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white mt-4 tracking-tight">
                        {formatIDR(stats.financials.total_expense)}
                      </h2>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-4 border-t border-white/5">
                        <span>Pengeluaran Operasional</span>
                        <span>{formatIDR(stats.financials.expense_breakdown["Bahan Baku"] || 0)} Bahan Baku</span>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl glass flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">Laba Bersih</span>
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><DollarSign size={16} /></div>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white mt-4 tracking-tight">
                        {formatIDR(stats.financials.net_profit)}
                      </h2>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-4 border-t border-white/5">
                        <span>Margin Laba Bersih</span>
                        <span className="font-bold text-purple-400">
                          {stats.financials.total_income > 0 ? ((stats.financials.net_profit / stats.financials.total_income) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl glass flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">Estimasi Pajak PP 55</span>
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Coins size={16} /></div>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white mt-4 tracking-tight">
                        {formatIDR(stats.tax.total_tax_due)}
                      </h2>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-4 border-t border-white/5">
                        <span>Sisa Belum Disetor</span>
                        <span className={`font-bold ${stats.tax.remaining_tax_due > 0 ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
                          {stats.tax.remaining_tax_due > 0 ? formatIDR(stats.tax.remaining_tax_due) : "Lunas / Bebas"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Bar chart */}
                    <div className="p-6 rounded-2xl glass col-span-2 flex flex-col">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">Arus Kas (Pemasukan vs Pengeluaran)</h3>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cashflowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                              contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}
                              labelStyle={{ fontWeight: "bold", color: "#fff" }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Expense Pie chart */}
                    <div className="p-6 rounded-2xl glass flex flex-col justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Distribusi Pengeluaran</h3>
                      {expensePieData.length > 0 ? (
                        <div className="h-56 w-full flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={expensePieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {expensePieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(value: any) => formatIDR(Number(value))} />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Inner center text */}
                          <div className="absolute text-center">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Belanja</span>
                            <h4 className="text-sm font-extrabold text-white mt-0.5">{formatIDR(stats.financials.total_expense)}</h4>
                          </div>
                        </div>
                      ) : (
                        <div className="h-56 flex items-center justify-center text-slate-500 text-xs font-semibold">
                          Belum ada transaksi pengeluaran.
                        </div>
                      )}
                      {/* Legend List */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-white/5">
                        {expensePieData.map((item, index) => (
                          <div key={item.name} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span className="text-slate-400 truncate">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Transactions Table */}
                    <div className="p-6 rounded-2xl glass lg:col-span-2 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Transaksi Terbaru</h3>
                        <button
                          onClick={() => setActiveTab("bookkeeping")}
                          className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          Lihat Semua <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="pb-3">Tanggal</th>
                              <th className="pb-3">Deskripsi</th>
                              <th className="pb-3">Kategori</th>
                              <th className="pb-3 text-right">Nominal</th>
                              <th className="pb-3 text-center">Sumber</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                            {stats.financials.transaction_count > 0 ? (
                              // We can list first 5 transactions by fetching standard list in background
                              // But to avoid double fetch, we can extract from local data or show first 5
                              transactions.slice(0, 5).map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                  <td className="py-3.5 font-medium">{tx.date}</td>
                                  <td className="py-3.5 max-w-[150px] truncate">{tx.description}</td>
                                  <td className="py-3.5">{tx.category}</td>
                                  <td className={`py-3.5 text-right font-bold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                                    {tx.type === "income" ? "+" : "-"} {formatIDR(tx.amount)}
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-400 capitalize">{tx.source}</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-semibold">
                                  Belum ada pencatatan transaksi untuk tahun ini.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Health analytical breakdown */}
                    <div className="p-6 rounded-2xl glass flex flex-col">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">Analisis Kesehatan Bisnis</h3>
                      <div className="flex items-center gap-6 mb-6">
                        {/* Radial progress simulator */}
                        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" className="stroke-slate-800 fill-none" strokeWidth="8" />
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              className="fill-none stroke-current"
                              strokeWidth="8"
                              strokeDasharray={251.2}
                              strokeDashoffset={251.2 - (251.2 * stats.health.score) / 100}
                              style={{ transition: "stroke-dashoffset 1s ease" }}
                              color={stats.health.color}
                            />
                          </svg>
                          <div className="absolute text-center">
                            <h4 className="text-xl font-extrabold text-white">{stats.health.score}</h4>
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Skor</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white mb-1">{stats.health.level}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{stats.health.description}</p>
                        </div>
                      </div>
                      {/* Recommendations checks */}
                      <ul className="space-y-2.5 text-xs text-slate-300">
                        {stats.health.reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 shrink-0 mt-0.5"><CheckCircle size={14} /></span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. BOOKKEEPING TAB */}
              {activeTab === "bookkeeping" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Filters Bar */}
                  <div className="p-5 rounded-2xl glass flex flex-wrap gap-6 items-center justify-between">
                    <div className="flex flex-wrap gap-6 items-center">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipe Transaksi</label>
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                        >
                          <option value="">Semua Tipe</option>
                          <option value="income">Pemasukan (Omzet)</option>
                          <option value="expense">Pengeluaran</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kategori</label>
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                        >
                          <option value="">Semua Kategori</option>
                          {filterType === "" ? (
                            <>
                              {CATEGORIES.income.concat(CATEGORIES.expense).map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </>
                          ) : (
                            CATEGORIES[filterType]?.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsPlModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-all"
                    >
                      <FileText size={16} /> Laporan Laba Rugi
                    </button>
                  </div>

                  {/* Ledger Table */}
                  <div className="rounded-2xl glass overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500 px-6">
                            <th className="py-4 px-6">Tanggal</th>
                            <th className="py-4 px-6">Deskripsi</th>
                            <th className="py-4 px-6">Tipe</th>
                            <th className="py-4 px-6">Kategori</th>
                            <th className="py-4 px-6 text-right">Nominal</th>
                            <th className="py-4 px-6 text-center">Sumber</th>
                            <th className="py-4 px-6 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                          {transactions.length > 0 ? (
                            transactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-4 px-6 font-semibold">{tx.date}</td>
                                <td className="py-4 px-6 max-w-[200px] truncate">{tx.description}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {tx.type === "income" ? "Income" : "Expense"}
                                  </span>
                                </td>
                                <td className="py-4 px-6">{tx.category}</td>
                                <td className={`py-4 px-6 text-right font-extrabold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                                  {tx.type === "income" ? "+" : "-"} {formatIDR(tx.amount)}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-400 capitalize">{tx.source}</span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <button
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg hover:scale-105 active:scale-95 transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500 text-xs font-semibold">
                                Belum ada transaksi yang sesuai dengan filter ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. TAX COPILOT TAB */}
              {activeTab === "tax" && stats && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Monthly Tax Log */}
                    <div className="p-6 rounded-2xl glass lg:col-span-2 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Buku Pajak Bulanan (PP 55 Tahun 2022)</h3>
                        <p className="text-xs text-slate-500 mt-1 mb-6">
                          Rekapitulasi omset kumulatif dan perhitungan PPh Final 0,5% Wajib Pajak <strong>{stats.business_type}</strong>.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="pb-3">Bulan</th>
                              <th className="pb-3 text-right">Omset Bulanan</th>
                              <th className="pb-3 text-right">Omset Kumulatif</th>
                              <th className="pb-3 text-right">Omset Kena Pajak</th>
                              <th className="pb-3 text-right">Pajak Terutang (0.5%)</th>
                              <th className="pb-3 text-right">Telah Dibayar</th>
                              <th className="pb-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                            {stats.tax.months.map((m: any) => (
                              <tr key={m.month_code} className="hover:bg-white/5 transition-colors">
                                <td className="py-3.5 font-semibold">{m.month_name}</td>
                                <td className="py-3.5 text-right font-medium">{formatIDR(m.turnover)}</td>
                                <td className="py-3.5 text-right text-slate-400">{formatIDR(m.cumulative_turnover)}</td>
                                <td className="py-3.5 text-right text-slate-400">{formatIDR(m.taxable_turnover)}</td>
                                <td className="py-3.5 text-right font-bold text-amber-400">{formatIDR(m.tax_due)}</td>
                                <td className="py-3.5 text-right text-emerald-400 font-semibold">{formatIDR(m.tax_paid)}</td>
                                <td className="py-3.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    m.status === "Bebas Pajak" ? "bg-slate-800 text-slate-400" : m.status === "Lunas" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                  }`}>
                                    {m.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tax Sidebar Grid */}
                    <div className="space-y-8">
                      {/* Payment simulator */}
                      <div className="p-6 rounded-2xl glass">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Bayar Pajak Bulanan</h3>
                        <div className="space-y-4 text-left">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pilih Bulan Pembayaran</label>
                            <select
                              value={payMonth}
                              onChange={(e) => setPayMonth(e.target.value)}
                              className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                            >
                              {stats.tax.months.map((m: any) => (
                                <option key={m.month_code} value={m.month_code}>{m.month_name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1 text-left p-3 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[10px] font-semibold text-slate-400">Jumlah Harus Dibayar</span>
                            <h3 className="text-2xl font-extrabold text-white mt-1">
                              {(() => {
                                const m = stats.tax.months.find((x: any) => x.month_code === payMonth);
                                return m ? formatIDR(Math.max(0, m.tax_due - m.tax_paid)) : "Rp 0";
                              })()}
                            </h3>
                          </div>
                          <button
                            onClick={handlePayTax}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-amber-500/10 transition-all"
                          >
                            <Coins size={16} /> Simulasikan Bayar (e-Billing)
                          </button>
                        </div>
                      </div>

                      {/* Simulator */}
                      <div className="p-6 rounded-2xl glass">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Simulasi Pajak Setahun</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">Hitung estimasi pajak setahun berdasarkan omset bulanan tetap.</p>
                        <form onSubmit={handleRunSimulation} className="space-y-4 text-left">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Omset Bulanan (Rp)</label>
                            <input
                              type="number"
                              placeholder="Contoh: 50000000"
                              value={simTurnover}
                              onChange={(e) => setSimTurnover(e.target.value)}
                              className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                              min="0"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bentuk Usaha</label>
                            <select
                              value={simBizType}
                              onChange={(e) => setSimBizType(e.target.value)}
                              className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                            >
                              <option value="Orang Pribadi">Orang Pribadi</option>
                              <option value="Badan Usaha">Badan Usaha (CV/PT)</option>
                            </select>
                          </div>
                          <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/10 transition-all"
                          >
                            <Calculator size={16} /> Hitung Simulasi
                          </button>
                        </form>
                        {simResult && (
                          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 text-left text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                            <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[10px] text-slate-400">Hasil Simulasi</h4>
                            <p className="text-slate-300 font-medium leading-relaxed">{simResult.summary}</p>
                            <div className="mt-2 text-[11px] text-slate-500 font-semibold">
                              <span>Total omset tahunan: {formatIDR(simResult.annual_turnover)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. WHATSAPP AI ASSISTANT TAB */}
              {activeTab === "whatsapp" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Phone simulator */}
                  <div className="lg:col-span-2 flex justify-center">
                    <div className="w-[360px] h-[640px] rounded-[36px] bg-slate-900 border-[10px] border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
                      {/* Top status bar mock */}
                      <div className="h-6 bg-slate-800 shrink-0 flex items-center justify-between px-6 text-[10px] text-slate-400 font-semibold">
                        <span>10:59</span>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-1.5 bg-slate-400 rounded-sm"></span>
                          <span>LTE</span>
                        </div>
                      </div>

                      {/* Header */}
                      <div className="h-14 bg-teal-850 shrink-0 flex items-center justify-between px-4 text-white border-b border-teal-900/10" style={{ backgroundColor: "#075e54" }}>
                        <div className="flex items-center gap-2">
                          <span className="cursor-pointer"><ArrowLeft size={16} /></span>
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 border border-teal-400/20">
                            <Scale size={16} />
                          </div>
                          <div className="text-left">
                            <h4 className="text-xs font-bold">TaxOS Assistant</h4>
                            <span className="text-[9px] text-teal-200 font-medium">online</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-200">
                          <Video size={16} />
                          <Phone size={14} />
                          <MoreVertical size={16} />
                        </div>
                      </div>

                      {/* Chat body */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col bg-[#e5ddd5]" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: "cover" }}>
                        {waMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`max-w-[80%] rounded-lg p-2.5 shadow-sm text-xs text-left leading-relaxed ${
                              msg.type === "incoming" ? "bg-white text-slate-800 self-start" : "bg-[#dcf8c6] text-slate-800 self-end"
                            }`}
                          >
                            <p className="whitespace-pre-line">{msg.text}</p>
                            <span className="block text-right text-[9px] text-slate-400 mt-1 font-semibold">{msg.time}</span>
                          </div>
                        ))}
                        <div ref={waChatEndRef} />
                      </div>

                      {/* Chat footer input */}
                      <div className="h-14 bg-slate-900 border-t border-white/5 shrink-0 flex items-center px-3 gap-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-10 flex items-center px-4 gap-2 border border-white/5">
                          <button
                            onClick={() => {
                              setOcrType("coffee_shop");
                              setIsOcrModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            <Paperclip size={18} />
                          </button>
                          <input
                            type="text"
                            placeholder="Ketik pesan transaksi..."
                            value={waInputText}
                            onChange={(e) => setWaInputText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                            className="flex-1 bg-transparent text-white text-xs outline-none"
                            disabled={sendingMessage}
                          />
                        </div>
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={sendingMessage || !waInputText.trim()}
                          className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-500 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all shrink-0"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Informational Panel */}
                  <div className="space-y-6 text-left">
                    <div className="p-6 rounded-2xl glass">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Uji Coba Asisten Chat</h3>
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        Tuliskan transaksi dengan bahasa alami Anda sendiri. AI kami akan mendeteksi tipe transaksi, nominal, deskripsi, dan kategorinya secara otomatis.
                      </p>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pilih Template Cepat</h4>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => sendWhatsAppTemplate("Hari ini omset penjualan tunai Rp 1.850.000")}
                            className="text-left text-xs p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                          >
                            "Hari ini omset penjualan tunai Rp 1.850.000"
                          </button>
                          <button
                            onClick={() => sendWhatsAppTemplate("Bayar belanja kopi dan telur 450 ribu")}
                            className="text-left text-xs p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                          >
                            "Bayar belanja kopi dan telur 450 ribu"
                          </button>
                          <button
                            onClick={() => sendWhatsAppTemplate("Gaji helper warung 1.500.000")}
                            className="text-left text-xs p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                          >
                            "Gaji helper warung 1.500.000"
                          </button>
                          <button
                            onClick={() => sendWhatsAppTemplate("Berapa batas omset bebas pajak bagi wajib pajak perorangan?")}
                            className="text-left text-xs p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                          >
                            "Berapa batas omset bebas pajak?"
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl glass">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Simulasi Upload Dokumen (OCR)</h3>
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">Simulasikan pembacaan nota belanja menggunakan OCR berbasis kecerdasan buatan.</p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setOcrType("coffee_shop");
                            setIsOcrModalOpen(true);
                          }}
                          className="flex items-center justify-between text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 transition-all font-bold"
                        >
                          <span>Nota Kopi & Susu (Bahan)</span>
                          <ImageIcon size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setOcrType("tokopedia_invoice");
                            setIsOcrModalOpen(true);
                          }}
                          className="flex items-center justify-between text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 transition-all font-bold"
                        >
                          <span>Invoice Printer Thermal (Ops)</span>
                          <ImageIcon size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setOcrType("daily_revenue");
                            setIsOcrModalOpen(true);
                          }}
                          className="flex items-center justify-between text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 transition-all font-bold"
                        >
                          <span>POS Moka Harian (Omset)</span>
                          <ImageIcon size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. REGULATIONS TAB */}
              {activeTab === "knowledge" && (
                <div className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-6 rounded-2xl glass">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">RAG Knowledge Base — Aturan Perpajakan Indonesia</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6">Cari pasal-pasal undang-undang perpajakan, PMK, dan FAQ resmi DJP/Coretax menggunakan pencarian teks lengkap FTS5.</p>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="Ketik kata kunci pencarian (misal: 'omset bebas pajak', 'PT', 'fasilitas PP 55')..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleRegSearch(e.target.value);
                        }}
                        className="flex-1 bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        onClick={() => handleRegSearch(searchQuery)}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all"
                      >
                        Cari Dokumen
                      </button>
                    </div>
                  </div>

                  {/* Regulations list */}
                  <div className="space-y-4">
                    {searchingRegs ? (
                      <div className="py-12 flex justify-center">
                        <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                      </div>
                    ) : searchResult.length > 0 ? (
                      searchResult.map((reg) => (
                        <div key={reg.id} className="p-6 rounded-2xl glass border border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-400 uppercase tracking-wider">{reg.source_doc}</span>
                            <span className="text-xs font-semibold text-slate-400">{reg.article}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white leading-snug">{reg.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{reg.content}</p>
                          {reg.explanation && (
                            <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs leading-relaxed text-emerald-300">
                              <span className="font-bold">💡 Artinya: </span> {reg.explanation}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                        Tidak ada regulasi perpajakan yang ditemukan.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. LEDGER TAB */}
              {activeTab === "ledger" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <AccountingLedger clientId={1} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ----------------- MODALS ----------------- */}

      {/* 1. Transaction Form Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl glass border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setIsTxModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold text-white mb-6 uppercase tracking-wider text-slate-400">Tambah Transaksi Manual</h3>
            <form onSubmit={handleAddTransactionSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tanggal</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipe</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                    required
                  >
                    <option value="income">Pemasukan (Omzet)</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kategori</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                    required
                  >
                    {CATEGORIES[txType]?.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nominal (Rupiah)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 1500000"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Deskripsi</label>
                <input
                  type="text"
                  placeholder="Contoh: Penjualan nasi goreng katering siang"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/10 transition-all"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Settings Profile Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl glass border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold text-white mb-6 uppercase tracking-wider text-slate-400">Pengaturan Profil Bisnis</h3>
            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Usaha / UMKM</label>
                <input
                  type="text"
                  value={setBizName}
                  onChange={(e) => setSetBizName(e.target.value)}
                  className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bentuk Usaha / Wajib Pajak</label>
                <select
                  value={setBizType}
                  onChange={(e) => setSetBizType(e.target.value)}
                  className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                  required
                >
                  <option value="Orang Pribadi">Wajib Pajak Orang Pribadi (Individu)</option>
                  <option value="Badan Usaha">Badan Usaha (CV / PT / Koperasi)</option>
                </select>
                <small className="text-[10px] text-slate-500 leading-normal mt-1">
                  Wajib Pajak Orang Pribadi mendapat fasilitas batas omset bebas pajak Rp 500 Juta setahun. Wajib Pajak Badan dikenai 0,5% dari rupiah pertama.
                </small>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/10 transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Mock OCR Upload Modal */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-2xl glass border border-white/10 shadow-2xl relative text-center">
            <button
              onClick={() => setIsOcrModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Simulasi Pengiriman Dokumen (OCR)</h3>

            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 text-left font-mono text-xs text-slate-400 space-y-2 relative overflow-hidden">
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold text-slate-500">
                <span>FAKTUR/NOTA STRIP</span>
                <span>MOCK OCR</span>
              </div>
              {ocrType === "coffee_shop" && (
                <>
                  <p className="font-bold text-slate-200 text-center uppercase tracking-wide">KOPI MAKMUR JAYA</p>
                  <p className="text-center text-[10px]">Jl. Cihampelas No 48, Bandung</p>
                  <div className="border-t border-dashed border-white/10 my-2"></div>
                  <div className="flex justify-between"><span>2x Biji Kopi Arabika 1kg</span><span>Rp 200.000</span></div>
                  <div className="flex justify-between"><span>12x Susu UHT Kotak</span><span>Rp 150.000</span></div>
                  <div className="border-t border-dashed border-white/10 my-2"></div>
                  <div className="flex justify-between font-bold text-white"><span>TOTAL BELANJA</span><span>Rp 350.000</span></div>
                </>
              )}
              {ocrType === "tokopedia_invoice" && (
                <>
                  <p className="font-bold text-slate-200 text-center uppercase tracking-wide">TOKOPEDIA INVOICE</p>
                  <p className="text-center text-[10px]">No: INV/20260520/XX/39201920</p>
                  <div className="border-t border-dashed border-white/10 my-2"></div>
                  <div className="flex justify-between"><span>Printer Label Bluetooth XPrinter</span><span>Rp 750.000</span></div>
                  <div className="border-t border-dashed border-white/10 my-2"></div>
                  <div className="flex justify-between font-bold text-white"><span>TOTAL BAYAR</span><span>Rp 750.000</span></div>
                </>
              )}
              {ocrType === "daily_revenue" && (
                <>
                  <p className="font-bold text-slate-200 text-center uppercase tracking-wide">MOKA POS EXPORT</p>
                  <p className="text-center text-[10px]">Tanggal: 11 Juni 2026</p>
                  <div className="border-t border-dashed border-white/10 my-2"></div>
                  <div className="flex justify-between"><span>Transaksi Berhasil (48)</span><span>Rp 4.200.000</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>- Penjualan QRIS</span><span>Rp 2.400.000</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>- Penjualan Tunai</span><span>Rp 1.800.000</span></div>
                  <div className="border-t border-dashed border-white/10 my-2"></div>
                  <div className="flex justify-between font-bold text-white"><span>REKAP OMSET</span><span>Rp 4.200.000</span></div>
                </>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-4 leading-normal">
              Kirim simulasi berkas data ini ke asisten chat TaxOS untuk diolah otomatis.
            </p>

            <div className="flex justify-center gap-3 pt-6 mt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsOcrModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendOcr}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-amber-500/10 transition-all"
              >
                Kirim ke WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Profit & Loss Report Modal */}
      {isPlModalOpen && stats && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-6 rounded-2xl glass border border-white/10 shadow-2xl relative flex flex-col justify-between">
            <button
              onClick={() => setIsPlModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all print:hidden"
            >
              <X size={16} />
            </button>
            <div className="text-left font-sans pl-print-area space-y-6">
              <div className="text-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">{stats.business_name}</h2>
                <p className="text-xs text-slate-400 mt-1">Laporan Laba Rugi Sederhana</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">Periode: 1 Januari — 31 Desember {currentYear}</p>
              </div>

              <div className="space-y-4">
                {/* Income */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-white">
                    <span>PENDAPATAN (OMZET)</span>
                    <span>{formatIDR(stats.financials.total_income)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 pl-4">
                    <span>Penjualan</span>
                    <span>{formatIDR(stats.financials.income_breakdown["Penjualan"] || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 pl-4">
                    <span>Pemasukan Lain</span>
                    <span>{formatIDR(stats.financials.income_breakdown["Pemasukan Lain"] || 0)}</span>
                  </div>
                </div>

                {/* Expenses */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-white pt-2 border-t border-white/5">
                    <span>PENGELUARAN</span>
                    <span className="text-red-400">{formatIDR(stats.financials.total_expense)}</span>
                  </div>
                  {Object.keys(stats.financials.expense_breakdown).map((cat) => (
                    <div key={cat} className="flex justify-between text-xs text-slate-400 pl-4">
                      <span>{cat}</span>
                      <span>{formatIDR(stats.financials.expense_breakdown[cat] || 0)}</span>
                    </div>
                  ))}
                </div>

                {/* Total Net Profit */}
                <div className="flex justify-between text-sm font-extrabold text-white pt-4 border-t-2 border-white/10">
                  <span>LABA BERSIH (Sebelum Pajak Akhir)</span>
                  <span className={stats.financials.net_profit >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatIDR(stats.financials.net_profit)}
                  </span>
                </div>

                {/* Tax information */}
                <div className="flex justify-between text-xs font-bold text-slate-400 pt-2 border-t border-white/5">
                  <span>Pajak PP 55 Terutang (0.5% Final PPh)</span>
                  <span className="text-amber-400">{formatIDR(stats.tax.total_tax_due)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/5 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5"
              >
                <Printer size={14} /> Cetak Laporan
              </button>
              <button
                type="button"
                onClick={() => setIsPlModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
