'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Parallax mouse effect for 3D Mockup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Mock data
  const clientLogos = [
    { name: 'Kopi Toko Djawa', icon: 'fa-coffee' },
    { name: 'BukuMitra', icon: 'fa-book-open' },
    { name: 'AmanahTech Corp', icon: 'fa-microchip' },
    { name: 'Dapur Solo', icon: 'fa-utensils' },
    { name: 'Sentosa Logistics', icon: 'fa-truck-fast' },
    { name: 'Karya Nusantara', icon: 'fa-leaf' },
  ];

  const faqs = [
    {
      q: 'Apakah TaxOS terhubung langsung dengan sistem DJP?',
      a: 'TaxOS mempermudah rekapitulasi data e-Faktur dan kalkulasi SPT. Untuk pelaporan resmi, Anda dapat mengekspor berkas CSV/PDF terstandarisasi yang siap diunggah langsung ke portal DJP Online.'
    },
    {
      q: 'Apakah data keuangan bisnis saya aman di TaxOS?',
      a: 'Keamanan data Anda adalah prioritas kami. TaxOS mengenkripsi semua data transaksi menggunakan enkripsi tingkat militer (AES-256) baik saat transit maupun saat disimpan di database.'
    },
    {
      q: 'Bagaimana AI mendeteksi risiko SP2DK?',
      a: 'AI kami menganalisis rasio profitabilitas, rasio biaya operasional terhadap omset, serta pola PPN Masukan/Keluaran Anda, kemudian membandingkannya dengan rata-rata industri yang biasa diawasi oleh fiskus pajak.'
    },
    {
      q: 'Bisakah saya beralih paket atau membatalkan langganan kapan saja?',
      a: 'Tentu saja. Anda bebas beralih paket (upgrade/downgrade) atau membatalkan langganan Anda secara fleksibel melalui pengaturan akun tanpa biaya tersembunyi.'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.bgGlow1}></div>
      <div className={styles.bgGlow2}></div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={styles.nav}
      >
        <Link href="/dashboard" className={styles.logo}>
          <i className={`fa-solid fa-square-poll-vertical ${styles.logoIcon}`}></i>
          <span>TaxOS</span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Fitur</a>
          <a href="#pricing" className={styles.navLink}>Harga</a>
          <a href="#faq" className={styles.navLink}>FAQ</a>
          <Link href="/dashboard" className={styles.btnNav}>
            Masuk App
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className={styles.badge}
        >
          <i className="fa-solid fa-shield-halved" style={{ color: 'var(--accent-red)' }}></i>
          <span>Solusi Perlindungan Pajak #1 untuk 64 Juta UMKM Indonesia</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={styles.title}
        >
          Jangan Tunggu Surat <br />
          Teguran DJP (SP2DK) Datang.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={styles.subtitle}
        >
          Biarkan AI TaxOS menyedot mutasi bank Anda, melacak anomali, dan melaporkan SPT secara otonom. Tidur nyenyak tanpa bayang-bayang denda pajak.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className={styles.heroCta}
        >
          <Link href="/dashboard" className={styles.btnLarge}>
            Cek Risiko Pajak Saya (Gratis)
          </Link>
          <a href="#features" className={styles.btnSecondary}>
            Lihat Cara Kerjanya
          </a>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className={styles.socialProof}
        >
          <div className={styles.avatarGroup}>
            <img className={styles.avatar} src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60" alt="User 1" />
            <img className={styles.avatar} src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60" alt="User 2" />
            <img className={styles.avatar} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=60" alt="User 3" />
          </div>
          <span>Menyelamatkan 5,000+ pengusaha dari pusingnya urusan pajak</span>
        </motion.div>

        {/* 3D Dashboard Mockup Window */}
        <motion.div 
          className={styles.mockupContainer}
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 50, damping: 20, delay: 0.6 }}
        >
          <div className={styles.mockupFrame}>
            <div className={styles.mockupHeader}>
              <div className={styles.dot} style={{ backgroundColor: '#ff5f56' }}></div>
              <div className={styles.dot} style={{ backgroundColor: '#ffbd2e' }}></div>
              <div className={styles.dot} style={{ backgroundColor: '#27c93f' }}></div>
              <div className={styles.mockupTitle}>app.taxos.id/dashboard</div>
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.mockupSidebar}>
                <div className={`${styles.sidebarItem} ${styles.sidebarActive}`}>
                  <i className="fa-solid fa-chart-pie"></i> Radar Omzet (Max 4.8M)
                </div>
                <div className={styles.sidebarItem}>
                  <i className="fa-solid fa-receipt"></i> Tarik Mutasi Bank
                </div>
                <div className={styles.sidebarItem}>
                  <i className="fa-solid fa-wallet"></i> Buku Kas Warung
                </div>
                <div className={styles.sidebarItem}>
                  <i className="fa-solid fa-calculator"></i> 1-Click Lapor Otonom
                </div>
                <div className={styles.sidebarItem}>
                  <i className="fa-solid fa-shield-halved"></i> SP2DK Predictor
                </div>
              </div>
              <div className={styles.mockupContent}>
                <div className={styles.mockupStats}>
                  <div className={styles.statBox}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Omzet Masuk (YTD)</div>
                    <div className={styles.statVal} style={{ color: 'var(--income-color)' }}>Rp 1,42 M</div>
                  </div>
                  <div className={styles.statBox}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status Lapor SPT</div>
                    <div className={styles.statVal} style={{ color: 'var(--tax-color)' }}>Selesai (Nihil)</div>
                  </div>
                  <div className={styles.statBox}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Deteksi Anomali SP2DK</div>
                    <div className={styles.statVal} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
                        <span className={styles.pulseDot} style={{ width: '8px', height: '8px', backgroundColor: 'var(--accent-red)', borderRadius: '50%', display: 'inline-block' }}></span>
                        Rp 15,4 Jt (PPN)
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-robot"></i> AI Auto-Koreksi Aktif
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.mockupChart}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Grafik Performa Penjualan bulanan</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Jan - Des 2026</span>
                  </div>
                  <div className={styles.chartBars}>
                    <div className={styles.chartBar} style={{ height: '40%' }}></div>
                    <div className={styles.chartBar} style={{ height: '55%' }}></div>
                    <div className={styles.chartBar} style={{ height: '45%' }}></div>
                    <div className={styles.chartBar} style={{ height: '70%' }}></div>
                    <div className={styles.chartBar} style={{ height: '85%' }}></div>
                    <div className={styles.chartBar} style={{ height: '90%' }}></div>
                    <div className={styles.chartBar} style={{ height: '75%' }}></div>
                    <div className={styles.chartBar} style={{ height: '60%' }}></div>
                    <div className={styles.chartBar} style={{ height: '80%' }}></div>
                    <div className={styles.chartBar} style={{ height: '95%' }}></div>
                    <div className={styles.chartBar} style={{ height: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Infinite Logo Marquee Section */}
      <section className={styles.marqueeSection}>
        <div className={styles.marqueeTitle}>Solusi Andalan Pengusaha yang Menolak Pusing Urusan Pajak</div>
        <div className={styles.marquee}>
          <div className={styles.marqueeTrack}>
            {/* Render twice for infinite scrolling loop */}
            {[...clientLogos, ...clientLogos].map((logo, idx) => (
              <div key={idx} className={styles.logoItem}>
                <i className={`fa-solid ${logo.icon}`}></i>
                <span>{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid Section */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Sederhana di Luar, Tangguh di Dalam.</h2>
          <p className={styles.sectionSubtitle}>Didesain khusus untuk menggantikan kerumitan program akuntansi jadul.</p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Card 1 - PPN e-Faktur (Bento Large) */}
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`${styles.bentoCard} ${styles.bentoLarge}`}
          >
            <div className={styles.cardGlow}></div>
            <div className={styles.iconBox} style={{ color: 'var(--accent-blue)' }}>
              <i className="fa-solid fa-file-invoice"></i>
            </div>
            <h3>Otomatisasi Faktur & PPN</h3>
            <p>Rekapitulasi Faktur Keluaran dan Faktur Masukan secara real-time. Hasilkan file SPT Masa PPN yang siap diunggah langsung ke DJP untuk pelaporan yang mulus tanpa koreksi fiskal.</p>
          </motion.div>

          {/* Card 2 - SP2DK Alert */}
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={styles.bentoCard}
          >
            <div className={styles.cardGlow}></div>
            <div className={styles.iconBox} style={{ color: 'var(--accent-red)' }}>
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h3>Deteksi Dini SP2DK</h3>
            <p>AI memantau rasio bruto dan keselarasan pelaporan omset untuk menghindari surat teguran dari kantor pajak secara proaktif.</p>
          </motion.div>

          {/* Card 3 - Double-Entry Ledger */}
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={styles.bentoCard}
          >
            <div className={styles.cardGlow}></div>
            <div className={styles.iconBox} style={{ color: 'var(--accent-green)' }}>
              <i className="fa-solid fa-arrows-spin"></i>
            </div>
            <h3>Jurnal Otomatis</h3>
            <p>Sistem pencatatan double-entry ledger yang otomatis terisi ketika Anda menginput penjualan atau biaya operasional.</p>
          </motion.div>

          {/* Card 4 - AI Tax Advisor (Bento Large) */}
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`${styles.bentoCard} ${styles.bentoLarge}`}
          >
            <div className={styles.cardGlow}></div>
            <div className={styles.iconBox} style={{ color: 'var(--accent-indigo)' }}>
              <i className="fa-solid fa-robot"></i>
            </div>
            <h3>AI Tax Advisor 24/7</h3>
            <p>Chatbot AI terlatih yang bisa menjawab regulasi pajak terbaru, mengaudit faktur Anda, dan memberikan saran penghematan pajak layaknya konsultan senior, namun tanpa biaya per jam.</p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricing}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Investasi Kecil untuk Rasa Aman.</h2>
          <p className={styles.sectionSubtitle}>Biaya remeh untuk keamanan setahun penuh. Jauh lebih murah daripada denda DJP.</p>
        </div>

        {/* Yearly / Monthly Toggle Switch */}
        <div className={styles.pricingToggleWrapper}>
          <span>Bayar Bulanan</span>
          <div className={styles.toggleContainer} onClick={() => setIsYearly(!isYearly)}>
            <div className={`${styles.toggleButton} ${!isYearly ? styles.toggleActiveText : ''}`}>Bulanan</div>
            <div className={`${styles.toggleButton} ${isYearly ? styles.toggleActiveText : ''}`}>Tahunan</div>
            <motion.div 
              className={styles.toggleSlider}
              animate={{ left: isYearly ? '112px' : '4px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Bayar Tahunan 
            <span style={{ fontSize: '0.75rem', background: 'rgba(48,209,88,0.15)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Hemat 20%</span>
          </span>
        </div>

        <div className={styles.pricingGrid}>
          {/* UMKM Tier (Bebas Denda) - MAIN TARGET */}
          <div className={`${styles.pricingCard} ${styles.popular}`}>
            <div className={styles.popularBadge}>Paling Direkomendasikan</div>
            <div className={styles.planName} style={{ marginBottom: '4px' }}>UMKM & Warung</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-orange)', fontWeight: 600, marginBottom: '16px' }}>Max Omzet Rp 4,8 Miliar</div>
            <div className={styles.priceWrapper}>
              <span className={styles.priceSymbol}>Rp</span>
              <span className={styles.planPrice}>99rb</span>
              <span className={styles.planPeriod}>/ tahun</span>
            </div>
            <p className={styles.planDesc}>Perlindungan dari denda SP2DK setahun penuh. Setara Rp 8.250 / bulan.</p>
            <ul className={styles.featuresList}>
              <li><i className="fa-solid fa-circle-check"></i> 100% Gratis Lapor SPT Nihil</li>
              <li><i className="fa-solid fa-circle-check"></i> Otonom Lapor PPh & PPN Bulanan</li>
              <li><i className="fa-solid fa-circle-check"></i> AI Deteksi Anomali Omzet Bank</li>
              <li><i className="fa-solid fa-circle-check"></i> Arsip Bukti Potong Terenkripsi</li>
            </ul>
            <Link href="/bebas-denda" className={`${styles.pricingBtn} ${styles.secondary}`}>
              Lihat Promo Bebas Denda
            </Link>
          </div>

          {/* Pro/Corporate Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.planName} style={{ marginBottom: '4px' }}>Corporate / PT</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 600, marginBottom: '16px' }}>Omzet &gt; Rp 4,8 Miliar (PKP)</div>
            <div className={styles.priceWrapper}>
              <span className={styles.priceSymbol}>Rp</span>
              <span className={styles.planPrice}>
                {isYearly ? '1,4jt' : '149rb'}
              </span>
              <span className={styles.planPeriod}>/ {isYearly ? 'tahun' : 'bulan'}</span>
            </div>
            <p className={styles.planDesc}>Fitur lengkap untuk bisnis beromzet tinggi, PKP, dan butuh mitigasi audit DJP.</p>
            <ul className={styles.featuresList}>
              <li><i className="fa-solid fa-circle-check"></i> Rekonsiliasi e-Faktur PPN Otomatis</li>
              <li><i className="fa-solid fa-circle-check"></i> PPh Badan, 21, dan Potong/Pungut</li>
              <li><i className="fa-solid fa-circle-check"></i> Double-Entry Ledger & Laba Rugi</li>
              <li><i className="fa-solid fa-circle-check"></i> Akses Prioritas AI Tax Advisor</li>
            </ul>
            <Link href="/dashboard" className={`${styles.pricingBtn} ${styles.primary}`}>
              Mulai Uji Coba Gratis
            </Link>
          </div>

          {/* Enterprise Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.planName}>Enterprise Audit</div>
            <div className={styles.priceWrapper}>
              <span className={styles.planPrice} style={{ fontSize: '2rem', letterSpacing: '-0.02em', marginTop: '12px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Hubungi Kami
              </span>
            </div>
            <p className={styles.planDesc}>Untuk korporasi skala besar dengan volume transaksi tinggi & butuh pengawasan pajak.</p>
            <ul className={styles.featuresList}>
              <li><i className="fa-solid fa-circle-check"></i> Semua fitur Corporate</li>
              <li><i className="fa-solid fa-circle-check"></i> Entitas Bisnis Tidak Terbatas</li>
              <li><i className="fa-solid fa-circle-check"></i> Bantuan Langsung Tax Consultant</li>
              <li><i className="fa-solid fa-circle-check"></i> API Integrasi & Prioritas CS</li>
            </ul>
            <a href="mailto:support@taxos.id" className={`${styles.pricingBtn} ${styles.secondary}`}>
              Hubungi Kami
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Pertanyaan yang Sering Diajukan.</h2>
        </div>
        <div className={styles.faqGrid}>
          {faqs.map((faq, idx) => (
            <div key={idx} className={styles.faqItem}>
              <div className={styles.faqQuestion} onClick={() => toggleFaq(idx)}>
                <span>{faq.q}</span>
                <i className={`fa-solid ${activeFaq === idx ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: 'var(--text-secondary)' }}></i>
              </div>
              <AnimatePresence initial={false}>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={styles.faqAnswer}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className={styles.ctaBanner}>
        <h2>Siap Menata Pajak Bisnis Anda?</h2>
        <p>Berhenti membayar mahal untuk konsultan pajak. Beralih ke sistem autopilot hari ini dan nikmati efisiensi tanpa batas.</p>
        <Link href="/dashboard" className={styles.btnLarge}>
          Ciptakan Akun Sekarang
        </Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <h3>TaxOS</h3>
            <p>AI CFO & Konsultan Pajak Pribadi yang dirancang untuk membebaskan para pengusaha dari stres dan kerumitan administrasi pajak di Indonesia.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Produk</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/page/automasi-ppn-pph">Automasi PPh & PPN</Link></li>
              <li><Link href="/bebas-denda">Kalkulator Risiko SP2DK</Link></li>
              <li><Link href="/page/integrasi-coretax">Integrasi Coretax DJP</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Sumber Daya</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/page/vs-konsultan">TaxOS vs Konsultan Tradisional</Link></li>
              <li><Link href="/page/panduan-pajak">Panduan Pajak 2026</Link></li>
              <li><Link href="/page/bantuan">Pusat Bantuan (FAQ)</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal & Keamanan</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/page/privacy-policy">Kebijakan Privasi</Link></li>
              <li><Link href="/page/terms-of-service">Syarat & Ketentuan</Link></li>
              <li><Link href="/page/security">Jaminan Keamanan (ISO 27001)</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} PT TaxOS Teknologi Indonesia. Hak Cipta Dilindungi Undang-Undang.</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="https://linkedin.com/company/taxos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}><i className="fa-brands fa-linkedin"></i></a>
            <a href="https://x.com/taxos_id" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}><i className="fa-brands fa-x-twitter"></i></a>
            <a href="https://instagram.com/taxos.id" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}><i className="fa-brands fa-instagram"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
