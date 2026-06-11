import { GoogleGenAI } from "@google/genai";
import { addTransaction, getTransactions } from "./bookkeeping";
import { CATEGORIES, DEFAULT_CATEGORIES } from "./constants";
import { searchRegulations } from "./rag";
import { Regulation } from "./db";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
let aiClient: any = null;

if (GEMINI_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_KEY });
  } catch (e: any) {
    console.error("Failed to initialize GoogleGenAI SDK:", e.message);
  }
} else {
  console.info("Info: GEMINI_API_KEY not found. Fallback heuristic AI engine will be used.");
}

async function callGemini(prompt: string): Promise<string | null> {
  if (!aiClient) return null;
  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return response.text || null;
  } catch (e: any) {
    console.error("Gemini API error:", e.message);
    return null;
  }
}

export function cleanAmountText(text: string): number {
  const original = text.toLowerCase().trim();

  // 1. Detect multiplier suffix BEFORE cleaning
  let multiplier = 1.0;
  const jutaMatch = original.match(/(\d[\d.,]*)\s*(juta|jt)\b/);
  const ribuMatch = original.match(/(\d[\d.,]*)\s*(ribu|rb)\b/);

  if (jutaMatch) {
    let numStr = jutaMatch[1];
    multiplier = 1000000;
    if (numStr.includes(",") && numStr.split(",").length - 1 === 1) {
      numStr = numStr.replace(/\./g, ""); // remove thousands dots first
      numStr = numStr.replace(",", "."); // comma -> decimal point
    } else {
      numStr = numStr.replace(/\./g, "").replace(/,/g, "");
    }
    const val = parseFloat(numStr);
    if (!isNaN(val)) return val * multiplier;
  }

  if (ribuMatch) {
    let numStr = ribuMatch[1];
    multiplier = 1000;
    if (numStr.includes(",") && numStr.split(",").length - 1 === 1) {
      numStr = numStr.replace(/\./g, "");
      numStr = numStr.replace(",", ".");
    } else {
      numStr = numStr.replace(/\./g, "").replace(/,/g, "");
    }
    const val = parseFloat(numStr);
    if (!isNaN(val)) return val * multiplier;
  }

  // 2. No multiplier suffix - look for raw number with dot-separators
  const cleaned = original.replace(/\brp\.?\s*/g, "");
  const numPatterns = cleaned.match(/\d{1,3}(?:\.\d{3})+|\d+/g);
  if (numPatterns && numPatterns.length > 0) {
    // Take the longest match
    const best = numPatterns.reduce((a, b) => (a.length > b.length ? a : b));
    if (/^\d{1,3}(?:\.\d{3})+$/.test(best)) {
      return parseFloat(best.replace(/\./g, ""));
    } else {
      return parseFloat(best);
    }
  }

  return 0.0;
}

export function parseDateKeywords(text: string): string {
  const clean = text.toLowerCase();
  const today = new Date();

  if (clean.includes("kemarin") || clean.includes("kemaren")) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  } else if (clean.includes("lusa")) {
    const lusa = new Date(today);
    lusa.setDate(today.getDate() - 2);
    return lusa.toISOString().slice(0, 10);
  } else {
    return today.toISOString().slice(0, 10);
  }
}

export interface HeuristicTransaction {
  is_transaction: boolean;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
}

export function parseTransactionHeuristics(text: string): HeuristicTransaction {
  const cleanText = text.toLowerCase();

  // 1. Determine Type via keyword scoring
  const expenseKeywords = [
    "bayar", "beli", "keluar", "belanja", "gaji", "listrik", "air",
    "sewa", "ongkir", "stok", "pembelian", "bahan", "biaya", "cicilan"
  ];
  const incomeKeywords = [
    "pemasukan", "omset", "omzet", "jual", "terima", "transfer masuk",
    "laku", "catering", "sales", "pendapatan", "penjualan", "order"
  ];

  let expenseScore = 0;
  let incomeScore = 0;
  for (const kw of expenseKeywords) {
    if (cleanText.includes(kw)) expenseScore++;
  }
  for (const kw of incomeKeywords) {
    if (cleanText.includes(kw)) incomeScore++;
  }

  let txType: "income" | "expense" = "income";
  if (expenseScore > incomeScore) {
    txType = "expense";
  } else if (incomeScore > expenseScore) {
    txType = "income";
  } else {
    if (cleanText.includes("untuk") || cleanText.includes("beli") || cleanText.includes("bayar")) {
      txType = "expense";
    } else {
      txType = "income";
    }
  }

  // 2. Extract Amount
  const amount = cleanAmountText(text);

  // 3. Determine Category
  let category = "";
  if (txType === "expense") {
    if (/(kain|kopi|telur|beras|bahan|stok|belanja|sayur|daging|bumbu|susu|tepung)/.test(cleanText)) {
      category = "Bahan Baku";
    } else if (/(listrik|air|ruko|internet|sewa|pulsa|bensin|telepon|operasional|printer|atk)/.test(cleanText)) {
      category = "Operasional";
    } else if (/(gaji|karyawan|staf|bonus|gajian|helper)/.test(cleanText)) {
      category = "Gaji";
    } else if (/(pajak|spt|billing|djp|pph)/.test(cleanText)) {
      category = "Pajak";
    } else {
      category = "Pengeluaran Lain";
    }
  } else {
    if (/(jual|catering|order|omset|omzet|laku|penjualan|laundry|sales)/.test(cleanText)) {
      category = "Penjualan";
    } else {
      category = "Pemasukan Lain";
    }
  }

  // 4. Create Clean Description
  let desc = text.trim();
  desc = desc.replace(/^(hari ini|kemarin|kemaren|tadi|tolong catat|catat)\s+/i, "").trim();

  // 5. Parse date from keywords
  const txDate = parseDateKeywords(text);

  const isTransaction = amount > 0 && desc.length > 3;

  return {
    is_transaction: isTransaction,
    type: txType,
    amount,
    description: desc,
    category,
    date: txDate
  };
}

function isPaymentAction(message: string): boolean {
  const clean = message.toLowerCase();
  const paymentVerbs = ["bayar", "setor", "transfer", "cicil", "lunasi"];
  const hasNumber = /\d/.test(message);
  const hasPaymentVerb = paymentVerbs.some((v) => clean.includes(v));
  return hasPaymentVerb && hasNumber;
}

function isSummaryRequest(message: string): boolean {
  const clean = message.toLowerCase();
  const summaryKeywords = ["ringkasan", "rekap", "rangkuman", "summary", "laporan hari ini", "total hari ini", "berapa hari ini"];
  return summaryKeywords.some((kw) => clean.includes(kw));
}

export async function processChatMessage(message: string): Promise<any> {
  if (!message.trim()) {
    return { response: "Pesan kosong. Silakan ketik sesuatu!" };
  }

  // 0. Check for summary request
  if (isSummaryRequest(message)) {
    return await generateDailySummary();
  }

  // 1. Check tax keywords
  const taxKeywords = ["pajak", "spt", "djp", "pp 55", "bebas pajak", "coretax", "badan usaha", "orang pribadi", "billing", "lapor", "denda", "pph"];
  let isTaxQuery = taxKeywords.some((kw) => message.toLowerCase().includes(kw));

  // 2. Parse transaction data via heuristics
  const txData = parseTransactionHeuristics(message);

  // 3. Fix: If it has tax keywords but is actually a payment transaction
  if (isTaxQuery && isPaymentAction(message)) {
    isTaxQuery = false;
  }

  // 4. If pure tax query -> RAG
  if (isTaxQuery && !txData.is_transaction) {
    return await handleTaxQuery(message);
  }

  if (isTaxQuery && txData.is_transaction) {
    if (isPaymentAction(message)) {
      return await handleTransaction(message, txData);
    } else {
      return await handleTaxQuery(message);
    }
  }

  // 5. Process general transaction
  if (txData.is_transaction) {
    return await handleTransaction(message, txData);
  }

  // 6. General Fallback
  return {
    is_transaction: false,
    is_tax_query: false,
    response:
      "Halo! Saya adalah TaxOS AI Assistant. 👋\n\n" +
      "Silakan kirim detail transaksi Anda untuk dicatat:\n" +
      "• *\"Bayar bahan baku kopi 200rb\"*\n" +
      "• *\"Jual nasi goreng 500rb\"*\n" +
      "• *\"Kemarin gaji karyawan 1,5 juta\"*\n\n" +
      "Atau tanyakan seputar pajak UMKM:\n" +
      "• *\"Gimana cara ngitung pajak PP 55?\"*\n" +
      "• *\"Berapa batas omset bebas pajak?\"*\n\n" +
      "Atau ketik *\"ringkasan hari ini\"* untuk rekap transaksi harian."
  };
}

async function handleTaxQuery(message: string): Promise<any> {
  const results = await searchRegulations(message, 2);
  let contextStr = "";
  for (const r of results) {
    contextStr +=
      `Sumber: ${r.source_doc} (${r.article})\n` +
      `Judul: ${r.title}\n` +
      `Isi: ${r.content}\n` +
      `Penjelasan: ${r.explanation || ""}\n\n`;
  }

  let aiResponse: string | null = null;
  if (aiClient) {
    const prompt =
      "Anda adalah TaxOS Copilot, asisten pajak cerdas untuk UMKM Indonesia.\n" +
      "Jawab pertanyaan Wajib Pajak berikut secara profesional, akurat, " +
      "dan mudah dipahami oleh orang awam.\n" +
      "Gunakan referensi peraturan resmi yang disediakan di bawah ini jika relevan. " +
      "Jika tidak tahu, katakan secara jujur.\n\n" +
      `KONTEKS REGULASI PAJAK:\n${contextStr}\n` +
      `PERTANYAAN USER:\n${message}\n\n` +
      "Format jawaban dengan rapi menggunakan poin-poin jika diperlukan. " +
      "Gunakan bahasa Indonesia yang ramah.";
    aiResponse = await callGemini(prompt);
  }

  if (!aiResponse) {
    aiResponse = generateFallbackTaxAnswer(message, results);
  }

  return {
    is_transaction: false,
    is_tax_query: true,
    response: aiResponse,
    references: results
  };
}

async function handleTransaction(message: string, txData: HeuristicTransaction): Promise<any> {
  if (aiClient) {
    const prompt =
      `Klasifikasikan kalimat pencatatan keuangan berikut ke dalam JSON terstruktur.\n` +
      `Kalimat: "${message}"\n\n` +
      `Kategori Pengeluaran valid: ${CATEGORIES.expense.join(", ")}\n` +
      `Kategori Pemasukan valid: ${CATEGORIES.income.join(", ")}\n\n` +
      `OUTPUT JSON (tanpa markdown formatting):\n` +
      `{"is_transaction": true, "type": "income" atau "expense", ` +
      `"amount": angka_nominal_integer, ` +
      `"description": "deskripsi singkat (tanpa nominal)", ` +
      `"category": "kategori paling cocok"}`;
    
    const aiRes = await callGemini(prompt);
    if (aiRes) {
      try {
        const aiResClean = aiRes.replace(/```json|```/g, "").trim();
        const refinedData = JSON.parse(aiResClean);
        if (refinedData.is_transaction) {
          txData.type = refinedData.type || txData.type;
          txData.amount = parseFloat(refinedData.amount) || txData.amount;
          txData.description = refinedData.description || txData.description;
          const cat = refinedData.category;
          const valid = CATEGORIES[txData.type] || [];
          if (valid.includes(cat)) {
            txData.category = cat;
          }
        }
      } catch (e: any) {
        console.warn("Gemini JSON parse failed, utilizing heuristics:", e.message);
      }
    }
  }

  // Format currency
  const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  const amountFmt = formatter.format(txData.amount);
  const typeStr = txData.type === "income" ? "Pemasukan" : "Pengeluaran";

  const responseText =
    `✅ **${typeStr} Berhasil Dicatat!**\n\n` +
    `• **Deskripsi**: ${txData.description}\n` +
    `• **Kategori**: ${txData.category}\n` +
    `• **Nominal**: **${amountFmt}**`;

  return {
    is_transaction: true,
    is_tax_query: false,
    response: responseText,
    transaction: txData
  };
}

async function generateDailySummary(): Promise<any> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const txs = await getTransactions({ start_date: todayStr, end_date: todayStr });

  if (txs.length === 0) {
    return {
      is_transaction: false,
      is_tax_query: false,
      response:
        "📊 **Ringkasan Hari Ini**\n\n" +
        "Belum ada transaksi yang tercatat hari ini.\n" +
        "Mulai catat pengeluaran atau pemasukan Anda!"
    };
  }

  const totalIncome = txs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const net = totalIncome - totalExpense;

  const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  const incomeFmt = formatter.format(totalIncome);
  const expenseFmt = formatter.format(totalExpense);
  const netFmt = formatter.format(net);

  const lines = [
    `📊 **Ringkasan Hari Ini** (${todayStr})\n`,
    `• Jumlah transaksi: **${txs.length}**`,
    `• Total pemasukan: **${incomeFmt}**`,
    `• Total pengeluaran: **${expenseFmt}**`,
    `• Arus kas bersih: **${netFmt}**\n`,
    "**Rincian:**"
  ];

  for (const tx of txs.slice(0, 8)) {
    const icon = tx.type === "income" ? "🟢" : "🔴";
    const amt = formatter.format(tx.amount);
    lines.push(`${icon} ${tx.description} — ${amt}`);
  }

  return {
    is_transaction: false,
    is_tax_query: false,
    response: lines.join("\n")
  };
}

function generateFallbackTaxAnswer(query: string, searchResults: Regulation[]): string {
  if (searchResults.length === 0) {
    return (
      "Berdasarkan informasi umum perpajakan Indonesia:\n\n" +
      "1. **Pajak UMKM (PP 55/2022)**: UMKM dengan omset maksimal Rp 4,8 Miliar " +
      "per tahun dikenai PPh Final sebesar **0,5%**.\n" +
      "2. **Batas Bebas Pajak**: Untuk Wajib Pajak Orang Pribadi (individu), " +
      "terdapat batas omset bebas pajak sebesar **Rp 500 Juta per tahun**. " +
      "Pajak 0,5% hanya dibayar setelah akumulasi omset melewati Rp 500 juta.\n" +
      "3. **Badan Usaha (CV/PT)**: Tidak mendapat fasilitas batas bebas Rp 500 juta. " +
      "CV dan PT langsung membayar 0,5% sejak rupiah pertama omset mereka.\n\n" +
      "Ada pertanyaan spesifik mengenai bisnis Anda yang ingin disimulasikan?"
    );
  }

  const topHit = searchResults[0];
  let ans = `Berdasarkan **${topHit.article}** tentang *${topHit.title}*:\n\n`;
  ans += `${topHit.content}\n\n`;
  if (topHit.explanation) {
    ans += `💡 **Artinya**: ${topHit.explanation}\n\n`;
  }
  ans += "Apakah penjelasan ini cukup membantu? Anda bisa memantau estimasi pajak secara otomatis di menu utama dashboard.";
  return ans;
}

export function simulateOcrReceipt(receiptType: string): any {
  const receipts: Record<string, any> = {
    coffee_shop: {
      description: "Belanja biji kopi arabika & susu segar",
      amount: 350000.0,
      type: "expense",
      category: "Bahan Baku",
      ocr_metadata: {
        merchant: "Kopi Makmur Jaya",
        items: ["Biji Kopi Arabika 2kg", "Susu UHT 12 Box"],
        tax_invoice: false
      }
    },
    tokopedia_invoice: {
      description: "Pembelian printer label thermal Tokopedia",
      amount: 750000.0,
      type: "expense",
      category: "Operasional",
      ocr_metadata: {
        merchant: "Thermal Solution Store",
        invoice_no: "INV/20260520/XX/39201920",
        items: ["Printer Label Bluetooth XPrinter"],
        tax_invoice: true
      }
    },
    daily_revenue: {
      description: "Pemasukan harian POS Kasir Moka",
      amount: 4200000.0,
      type: "income",
      category: "Penjualan",
      ocr_metadata: {
        source: "Moka POS Export",
        transactions_count: 48,
        cash_sales: 1800000,
        qris_sales: 2400000
      }
    }
  };

  return receipts[receiptType] || {
    description: "Nota pembelian umum",
    amount: 120000.0,
    type: "expense",
    category: "Pengeluaran Lain",
    ocr_metadata: { merchant: "Toko Kelontong Sejahtera" }
  };
}
