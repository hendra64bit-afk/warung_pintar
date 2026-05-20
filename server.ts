/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "15mb" }));

  // Helper to obtain Gemini API Client securely
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY tidak ditemukan di environment. Pastikan kunci telah diatur pada tab Settings > Secrets.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  /**
   * Endpoint Analisis Cerdas berbasis Gemini
   */
  app.post("/api/analyze", async (req, res) => {
    try {
      const { products, transactions } = req.body;
      
      if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: "Sediaan produk tidak valid. Pastikan data produk terkirim dengan benar." });
      }

      // Inisialisasi client secara lazy
      const ai = getAiClient();

      // Buat ringkasan data produk untuk Gemini
      const productsSummary = products.map(p => 
        `- ID: ${p.id}, Nama: "${p.name}", Kategori: "${p.category || 'Lainnya'}", HPP: Rp${p.costPrice}, Harga Jual: Rp${p.price}, Stok Saat Ini: ${p.stock}`
      ).join("\n");

      // Buat ringkasan transaksi untuk Gemini
      const transactionsSummary = (transactions && Array.isArray(transactions) && transactions.length > 0)
        ? transactions.map(t => {
            const itemsList = t.items.map(item => 
              `${item.name} (${item.quantity} pcs - Retur: ${item.returnedQuantity || 0} pcs)`
            ).join(", ");
            const dateStr = new Date(t.timestamp).toLocaleDateString("id-ID");
            return `- Nota #${t.id} (${dateStr}): Total Rp${t.total}, Profit Rp${t.total - t.items.reduce((sum, i) => sum + (i.costPrice * (i.quantity - (i.returnedQuantity || 0))), 0)}, Status: ${t.status || 'completed'} [${itemsList}]`;
          }).join("\n")
        : "Belum ada riwayat transaksi penjualan.";

      const prompt = `Anda adalah Konsultan Bisnis Toko Kasir & Retail Senior untuk "WarungPintar POS".
Misi Anda adalah melakukan analisis mendalam tentang toko berdasarkan data berikut untuk membantu pemilik warung memaksimalkan keuntungan dan ketepatan stok.

--- DATA INVENTARIS PRODUK WARUNG ---
${productsSummary}

--- DATA PENJUALAN & TRANSAKSI TERAKHIR ---
${transactionsSummary}

Berikan kesimpulan, statistik, analisis, serta saran yang sangat cerdas, akurat, dan dapat dieksekusi secara taktis.

Format balasan Anda HARUS berupa JSON valid dengan elemen skema persis berikut:
- "summary" (string): Deskripsi ringkasan eksekutif tingkat tinggi tentang status warung saat ini dalam 2-3 kalimat yang santun, ramah, dan memotivasi pemilik. Gunakan Bahasa Indonesia yang baik dan benar.
- "criticalStockAlerts" (array): Daftar produk yang kehabisan stok atau memiliki sisa stok yang kritis (misalnya ketersediaan di bawah 6 unit). Setiap objek harus memiliki field:
  - "productId" (string): ID dari produk terkait
  - "productName" (string): Nama produknya
  - "currentStock" (number): Stok saat ini
  - "recommendedRestock" (number): Jumlah unit yang harus dibeli/ditambahkan ke stok sekarang (rekomendasi jumlah yang presisi, misalnya 10, 25, dll)
  - "reason" (string): Kalimat alasan logis mengapa barang ini harus segera ditambah persediaannya (misalnya: "Stok tinggal 2 unit, padahal produk ini menyumbang penjualan stabil pada kategori bahan makanan pokok")
- "profitAnalysis" (object): Evaluasi profitabilitas:
  - "insights" (array of string): Minimal 3 lembar wawasan mutakhir seputar margin keuntungan, tren produk terlaris pembawa profit, atau inefisiensi pengeluaran modal (HPP).
  - "recommendations" (array of string): Minimal 3 strategi taktik penjualan murni yang praktis dijalankan, berfokus murni pada maksimalisasi margin/laba bersih warung (seperti bundling produk, promosi bersilang, atau pembersihan stok mandeg).
- "productPerformance" (array): Laporan laju produk per item:
  - "productId" (string): ID Produk
  - "name" (string): Nama Produk
  - "revenue" (number): Total omzet kotor yang dihasilkan dari produk ini (harga jual dikali kuantitas terjual bersih pasca retur)
  - "quantitySold" (number): Kuantitas kumulatif terjual aktual yang sukses diserahkan (setelah potongan retur)
  - "profit" (number): Laba bersih murni kotor yang disumbang produk ini (pendapatan dikurangi total HPP barang terjual bersih)
  - "status" (string): Status keterlakuan, pilih di antara: "Terlaris", "Stabil", "Lambat Laku" (slow moving), atau "Tidak Terjual" (belum pernah dibeli)
`;

      const apiParams = {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["summary", "criticalStockAlerts", "profitAnalysis", "productPerformance"],
            properties: {
              summary: { type: Type.STRING },
              criticalStockAlerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["productId", "productName", "currentStock", "recommendedRestock", "reason"],
                  properties: {
                    productId: { type: Type.STRING },
                    productName: { type: Type.STRING },
                    currentStock: { type: Type.INTEGER },
                    recommendedRestock: { type: Type.INTEGER },
                    reason: { type: Type.STRING }
                  }
                }
              },
              profitAnalysis: {
                type: Type.OBJECT,
                required: ["insights", "recommendations"],
                properties: {
                  insights: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  recommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              },
              productPerformance: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["productId", "name", "revenue", "quantitySold", "profit", "status"],
                  properties: {
                    productId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    revenue: { type: Type.INTEGER },
                    quantitySold: { type: Type.INTEGER },
                    profit: { type: Type.INTEGER },
                    status: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      };

      const models = [
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest"
      ];
      const maxRetriesPerModel = 2;
      const initialDelayMs = 1000;

      let response = null;
      let lastError : any = null;

      for (const model of models) {
        apiParams.model = model;
        console.log(`[Gemini] Mencoba pemanggilan konten menggunakan model: ${model}`);

        for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
          try {
            response = await ai.models.generateContent(apiParams);
            if (response && response.text) {
              console.log(`[Gemini] Berhasil diselesaikan menggunakan model ${model} pada percobaan #${attempt}.`);
              break;
            }
          } catch (err: any) {
            lastError = err;
            const message = err.message || "";
            const status = err.status || "";
            console.warn(`[Gemini] Model ${model} gagal pada percobaan #${attempt}:`, message);

            const isServiceUnavailable = 
              status === 503 || 
              message.includes("503") || 
              message.includes("UNAVAILABLE") || 
              message.toLowerCase().includes("high demand") ||
              message.toLowerCase().includes("overloaded") ||
              message.toLowerCase().includes("temporary");

            if (isServiceUnavailable && attempt < maxRetriesPerModel) {
              const delay = initialDelayMs * Math.pow(2, attempt - 1);
              console.log(`[Gemini] Menunggu ${delay}ms karena lonjakan traffic (503) sebelum mencoba kembali...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              break;
            }
          }
        }

        if (response && response.text) {
          break;
        }
      }

      if (response && response.text) {
        const resultText = response.text || "{}";
        return res.json({
          ...JSON.parse(resultText.trim()),
          isFallback: false
        });
      }

      // FALLBACK ENGINE: Jika seluruh pemanggilan model Gemini gagal (karena 503, overload, dsb.)
      console.warn("[Gemini Fallback] Mengaktifkan mesin kalkulasi analitik retail lokal...");

      // 1. Identifikasi stok kritis riil (stok < 6)
      const criticalStockAlerts = products
        .filter((p: any) => p.stock < 6)
        .map((p: any) => ({
          productId: p.id,
          productName: p.name,
          currentStock: p.stock,
          recommendedRestock: p.stock === 0 ? 30 : Math.max(10, 25 - p.stock),
          reason: `Stok sediaan saat ini menipis (tersisa ${p.stock} unit). Disarankan segera melakukan restok untuk menghindari penolakan transaksi pelanggan.`
        }));

      // 2. Rekonstruksi laju dan performa produk berdasarkan riwayat nota riil
      const productPerformance = products.map((p: any) => {
        let quantitySold = 0;
        let revenue = 0;
        let totalCostPrice = 0;

        if (transactions && Array.isArray(transactions)) {
          console.log(`[Gemini Fallback] Memproses peninjauan transaksi untuk produk ID: ${p.id}`);
          transactions.forEach((t: any) => {
            // Lewati jika transaksi diretur penuh
            if (t.status === 'returned' && !t.items.some((item: any) => (item.returnedQuantity || 0) < item.quantity)) {
               return; 
            }
            const item = t.items.find((i: any) => i.id === p.id);
            if (item) {
              const netQty = item.quantity - (item.returnedQuantity || 0);
              if (netQty > 0) {
                quantitySold += netQty;
                revenue += item.price * netQty;
                totalCostPrice += item.costPrice * netQty;
              }
            }
          });
        }

        const profit = revenue - totalCostPrice;
        let status = "Tidak Terjual";
        if (quantitySold >= 15) {
          status = "Terlaris";
        } else if (quantitySold >= 5) {
          status = "Stabil";
        } else if (quantitySold > 0) {
          status = "Lambat Laku";
        }

        return {
          productId: p.id,
          name: p.name,
          revenue,
          quantitySold,
          profit: Math.max(0, profit),
          status
        };
      });

      // 3. Susun data rekomendasi finansial secara logis
      const highProfitItems = [...productPerformance]
        .filter((p: any) => p.quantitySold > 0)
        .sort((a, b) => b.profit - a.profit);

      const insights = [
        "Koneksi utama dengan AI Gemini pusat sedang penuh (Error 503). Menampilkan kalkulasi analisis berbasis transaksi statistik toko riil.",
        `Terdapat ${criticalStockAlerts.length} produk dengan stok kritis di bawah batas aman penyimpanan (6 unit).`,
        highProfitItems.length > 0 
          ? `Produk "${highProfitItems[0].name}" menyumbangkan perolehan margin laba kotor tertinggi, senilai ${highProfitItems[0].profit.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}.`
          : "Belum ada akumulasi laba kotor signifikan karena aliran transaksi penjualan masih minim."
      ];

      const recommendations = [
        "Maksimalkan penawaran bundling silang (cross-selling) dengan mencampurkan sediaan terlaris dan produk lambat laku.",
        "Segera beli sediaan barang yang tercantum pada menu 'Alert Deteksi Stok Kritis' demi menjamin ketersediaan barang.",
        "Pertahankan margin keuntungan toko di angka minimum 15% - 20% di atas HPP produk untuk menjaga kesehatan likuiditas warung."
      ];

      return res.json({
        summary: "Pusat server AI Gemini sedang mengalami kepadatan akses (Spikes/503). Berkat teknologi tanggap darurat WarungPintar, kami menyajikan evaluasi analitik lokal berbasis kalkulasi keuangan dan persediaan stok toko riil secara tangguh.",
        criticalStockAlerts,
        profitAnalysis: {
          insights,
          recommendations
        },
        productPerformance,
        isFallback: true
      });

    } catch (error: any) {
      console.error("Analisa Gemini Error:", error);
      res.status(500).json({ error: error.message || "Ada kegagalan sistem ketika berinteraksi dengan AI Gemini." });
    }
  });

  // Integrasi Vite server middleware untuk mode Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Sajikan file statis hasil kompilasi React di mode Production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WarungPintar POS Server] Port: ${PORT}`);
  });
}

startServer();
