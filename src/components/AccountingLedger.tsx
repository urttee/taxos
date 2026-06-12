'use client';

import { useState, useEffect, useCallback } from 'react';

const fmtIDR = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n));

interface Account {
  id: number;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_code?: string;
}

interface JournalLine {
  id: number;
  account_code: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntry {
  id: number;
  date: string;
  description: string;
  reference?: string;
  lines: JournalLine[];
}

interface LedgerEntry {
  date: string;
  journal_id: number;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface BalanceSheet {
  date: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  assets: TrialBalanceRow[];
  liabilities: TrialBalanceRow[];
  equity: TrialBalanceRow[];
}

interface IncomeStatement {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  total_operating_expense: number;
  operating_profit: number;
  total_other_income_expense: number;
  net_profit_before_tax: number;
  tax_expense: number;
  net_profit_after_tax: number;
  revenue_items: TrialBalanceRow[];
  expense_items: TrialBalanceRow[];
}

export default function AccountingLedger({ clientId }: { clientId: number }) {
  const [activeSubTab, setActiveSubTab] = useState<'coa' | 'journals' | 'ledger' | 'trial_balance' | 'statements'>('journals');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  
  // Ledger view state
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  // Financial statements state
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [statementYear, setStatementYear] = useState<number>(2026);

  // Modals / forms
  const [showAddJournalForm, setShowAddJournalForm] = useState(false);
  const [jDate, setJDate] = useState(new Date().toISOString().substring(0, 10));
  const [jDesc, setJDesc] = useState('');
  const [jRef, setJRef] = useState('');
  const [jLines, setJLines] = useState<Array<{ account_code: string; debit: number; credit: number; description: string }>>([
    { account_code: '', debit: 0, credit: 0, description: '' },
    { account_code: '', debit: 0, credit: 0, description: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    const res = await fetch(`/api/accounting?action=accounts&client_id=${clientId}`);
    const data = await res.json();
    setAccounts(data);
    if (data.length > 0 && !selectedLedgerAccount) {
      setSelectedLedgerAccount(data[0].code);
    }
  }, [clientId, selectedLedgerAccount]);

  const loadJournals = useCallback(async () => {
    const res = await fetch(`/api/accounting?action=journals&client_id=${clientId}`);
    const data = await res.json();
    setJournals(data);
  }, [clientId]);

  const loadTrialBalance = useCallback(async () => {
    const res = await fetch(`/api/accounting?action=trial_balance&client_id=${clientId}`);
    const data = await res.json();
    setTrialBalance(data);
  }, [clientId]);

  const loadLedger = useCallback(async () => {
    if (!selectedLedgerAccount) return;
    const res = await fetch(`/api/accounting?action=ledger&account_code=${selectedLedgerAccount}&client_id=${clientId}`);
    const data = await res.json();
    setLedgerEntries(data.error ? [] : data);
  }, [clientId, selectedLedgerAccount]);

  const loadStatements = useCallback(async () => {
    const [bsRes, isRes] = await Promise.all([
      fetch(`/api/accounting?action=balance_sheet&as_of=${statementYear}-12-31&client_id=${clientId}`),
      fetch(`/api/accounting?action=income_statement&year=${statementYear}&client_id=${clientId}`),
    ]);
    setBalanceSheet(await bsRes.json());
    setIncomeStatement(await isRes.json());
  }, [clientId, statementYear]);

  // General load data
  useEffect(() => {
    loadAccounts();
    loadJournals();
    loadTrialBalance();
  }, [clientId, loadAccounts, loadJournals, loadTrialBalance]);

  // Reload ledger when account selected changes
  useEffect(() => {
    loadLedger();
  }, [selectedLedgerAccount, loadLedger]);

  // Reload statements when year or client changes
  useEffect(() => {
    loadStatements();
  }, [statementYear, loadStatements]);

  const handleInitCoA = async () => {
    const res = await fetch('/api/accounting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init_coa', client_id: clientId }),
    });
    if (res.ok) {
      loadAccounts();
    }
  };

  const handleAddJournalLine = () => {
    setJLines([...jLines, { account_code: '', debit: 0, credit: 0, description: '' }]);
  };

  const handleRemoveJournalLine = (index: number) => {
    if (jLines.length <= 2) return;
    setJLines(jLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, val: any) => {
    const updated = [...jLines];
    if (field === 'debit' || field === 'credit') {
      updated[index] = {
        ...updated[index],
        [field]: parseFloat(val) || 0,
        // Clear the other side to keep it clean (debit or credit only)
        [field === 'debit' ? 'credit' : 'debit']: 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setJLines(updated);
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const totalDebit = jLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = jLines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setFormError(`Jurnal tidak balance! Total Debit: ${fmtIDR(totalDebit)} vs Total Kredit: ${fmtIDR(totalCredit)}`);
      return;
    }

    if (jLines.some(l => !l.account_code)) {
      setFormError('Semua baris jurnal wajib memilih akun!');
      return;
    }

    const res = await fetch('/api/accounting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: jDate,
        description: jDesc,
        reference: jRef,
        lines: jLines,
        client_id: clientId,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setShowAddJournalForm(false);
      setJDesc('');
      setJRef('');
      setJLines([
        { account_code: '', debit: 0, credit: 0, description: '' },
        { account_code: '', debit: 0, credit: 0, description: '' },
      ]);
      loadJournals();
      loadTrialBalance();
      loadLedger();
      loadStatements();
    } else {
      setFormError(data.error || 'Gagal menyimpan jurnal.');
    }
  };

  const handleDeleteJournal = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus jurnal ini? Seluruh posting buku besar terkait akan dihapus.')) {
      const res = await fetch(`/api/accounting?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadJournals();
        loadTrialBalance();
        loadLedger();
        loadStatements();
      }
    }
  };

  // Helper values for validation
  const formTotalDebit = jLines.reduce((s, l) => s + l.debit, 0);
  const formTotalCredit = jLines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(formTotalDebit - formTotalCredit) < 0.01;

  // Normal balance direction per account type
  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'asset': return 'Aset';
      case 'liability': return 'Liabilitas';
      case 'equity': return 'Ekuitas';
      case 'revenue': return 'Pendapatan';
      case 'expense': return 'Beban';
      default: return type;
    }
  };

  return (
    <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header and CoA Warning */}
      <div className="section glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2>
            <i className="fa-solid fa-calculator" style={{ color: '#8b5cf6', marginRight: 8 }}></i>
            Buku Besar & Pembukuan Berpasangan (Double-Entry Ledger)
          </h2>
          {accounts.length === 0 && (
            <button className="btn btn-primary" onClick={handleInitCoA}>
              <i className="fa-solid fa-wand-magic-sparkles"></i> Inisialisasi Chart of Accounts (CoA)
            </button>
          )}
        </div>

        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
            <p>Chart of Accounts belum diinisialisasi untuk klien ini.</p>
            <p style={{ fontSize: 13 }}>Silakan klik tombol "Inisialisasi Chart of Accounts" di atas untuk membuat CoA standar perpajakan Indonesia.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 1 }}>
            {([
              { id: 'journals', label: 'Jurnal Umum', icon: 'fa-book-open' },
              { id: 'ledger', label: 'Buku Besar', icon: 'fa-book' },
              { id: 'trial_balance', label: 'Neraca Saldo', icon: 'fa-list-check' },
              { id: 'statements', label: 'Laporan Keuangan', icon: 'fa-file-invoice' },
              { id: 'coa', label: 'Daftar Akun (CoA)', icon: 'fa-folder-tree' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                className={`btn btn-sm ${activeSubTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveSubTab(tab.id)}
                style={{ borderRadius: '8px 8px 0 0', border: 'none', padding: '10px 16px' }}
              >
                <i className={`fa-solid ${tab.icon}`} style={{ marginRight: 6 }}></i>
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {accounts.length > 0 && (
        <>
          {/* TAB: JURNAL UMUM */}
          {activeSubTab === 'journals' && (
            <div className="section glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3>Daftar Jurnal Umum</h3>
                <button className="btn btn-sm btn-primary" onClick={() => setShowAddJournalForm(!showAddJournalForm)}>
                  <i className={`fa-solid ${showAddJournalForm ? 'fa-minus' : 'fa-plus'}`}></i> Catat Jurnal Baru
                </button>
              </div>

              {showAddJournalForm && (
                <form onSubmit={handleSaveJournal} style={{ marginBottom: 20, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ margin: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Entri Jurnal Berpasangan Baru</h4>
                  
                  {formError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '8px 12px', borderRadius: 6, fontSize: 13, borderLeft: '3px solid #ef4444' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
                      {formError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8' }}>Tanggal</label>
                      <input type="date" value={jDate} onChange={e => setJDate(e.target.value)} required />
                    </div>
                    <div style={{ flex: 2, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8' }}>Keterangan / Memo</label>
                      <input type="text" placeholder="Contoh: Penerimaan pembayaran piutang invoice INV-01" value={jDesc} onChange={e => setJDesc(e.target.value)} required />
                    </div>
                    <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8' }}>No. Referensi (Bukti/Invoice)</label>
                      <input type="text" placeholder="Contoh: INV-001" value={jRef} onChange={e => setJRef(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4, fontWeight: '600', fontSize: 12, color: '#94a3b8' }}>
                      <div style={{ flex: 2 }}>Akun Pembuat</div>
                      <div style={{ width: 140, textAlign: 'right' }}>Debit (Rp)</div>
                      <div style={{ width: 140, textAlign: 'right' }}>Kredit (Rp)</div>
                      <div style={{ flex: 2 }}>Catatan Baris (opsional)</div>
                      <div style={{ width: 40 }}></div>
                    </div>

                    {jLines.map((line, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 2 }}>
                          <select value={line.account_code} onChange={e => handleLineChange(idx, 'account_code', e.target.value)} required>
                            <option value="">-- Pilih Akun --</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.code}>
                                {acc.code} - {acc.name} ({getAccountTypeName(acc.type)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ width: 140 }}>
                          <input
                            type="number"
                            placeholder="0"
                            value={line.debit || ''}
                            onChange={e => handleLineChange(idx, 'debit', e.target.value)}
                            style={{ textAlign: 'right' }}
                            disabled={line.credit > 0}
                          />
                        </div>
                        <div style={{ width: 140 }}>
                          <input
                            type="number"
                            placeholder="0"
                            value={line.credit || ''}
                            onChange={e => handleLineChange(idx, 'credit', e.target.value)}
                            style={{ textAlign: 'right' }}
                            disabled={line.debit > 0}
                          />
                        </div>
                        <div style={{ flex: 2 }}>
                          <input
                            type="text"
                            placeholder="Detail baris..."
                            value={line.description}
                            onChange={e => handleLineChange(idx, 'description', e.target.value)}
                          />
                        </div>
                        <div style={{ width: 40, textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleRemoveJournalLine(idx)}
                            style={{ color: '#ef4444', padding: '6px' }}
                            disabled={jLines.length <= 2}
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddJournalLine}>
                        <i className="fa-solid fa-plus-circle"></i> Tambah Baris
                      </button>

                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ fontSize: 13, color: isBalanced ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                          Total D: {fmtIDR(formTotalDebit)} | K: {fmtIDR(formTotalCredit)} 
                          {isBalanced ? (
                            <span style={{ marginLeft: 8, color: '#10b981' }}><i className="fa-solid fa-circle-check"></i> Balanced</span>
                          ) : (
                            <span style={{ marginLeft: 8, color: '#f59e0b' }}><i className="fa-solid fa-circle-exclamation"></i> Tidak Balance</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowAddJournalForm(false)}>Batal</button>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={!isBalanced}>
                      <i className="fa-solid fa-check-double"></i> Posting Jurnal
                    </button>
                  </div>
                </form>
              )}

              {/* Journal Table */}
              <div style={{ overflowX: 'auto' }}>
                {journals.map(journal => (
                  <div key={journal.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '10px 16px', borderRadius: '8px 8px 0 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <span style={{ fontWeight: '600', marginRight: 12 }}>{journal.date}</span>
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>Ref: {journal.reference || '-'}</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: 14 }}>{journal.description}</p>
                      </div>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDeleteJournal(journal.id)} style={{ color: '#ef4444' }} title="Hapus Jurnal">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>

                    <div style={{ padding: '8px 16px' }}>
                      <table className="table" style={{ width: '100%', border: 'none', background: 'transparent' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: '#94a3b8' }}>
                            <th>Akun</th>
                            <th style={{ width: '40%' }}>Keterangan Baris</th>
                            <th style={{ textAlign: 'right', width: '20%' }}>Debit (Rp)</th>
                            <th style={{ textAlign: 'right', width: '20%' }}>Kredit (Rp)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journal.lines.map(line => {
                            const accName = accounts.find(a => a.code === line.account_code)?.name || line.account_code;
                            return (
                              <tr key={line.id} style={{ border: 'none' }}>
                                <td style={{ padding: '6px 0', paddingLeft: line.credit > 0 ? 24 : 0 }}>
                                  <span style={{ fontWeight: line.debit > 0 ? '600' : '400', color: line.debit > 0 ? '#fff' : '#cbd5e1' }}>
                                    {line.account_code} - {accName}
                                  </span>
                                </td>
                                <td style={{ padding: '6px 0', color: '#94a3b8', fontSize: 13 }}>{line.description || ''}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right' }}>{line.debit > 0 ? fmtIDR(line.debit) : ''}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right' }}>{line.credit > 0 ? fmtIDR(line.credit) : ''}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {journals.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                    Belum ada entri jurnal perpajakan yang dicatat.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: BUKU BESAR */}
          {activeSubTab === 'ledger' && (
            <div className="section glass" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3>Kartu Buku Besar (Ledger Card)</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, color: '#94a3b8' }}>Pilih Akun:</label>
                  <select
                    value={selectedLedgerAccount}
                    onChange={e => setSelectedLedgerAccount(e.target.value)}
                    style={{ width: 280 }}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedLedgerAccount && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Jurnal ID</th>
                        <th>Keterangan</th>
                        <th>Ref</th>
                        <th style={{ textAlign: 'right' }}>Debit (Rp)</th>
                        <th style={{ textAlign: 'right' }}>Kredit (Rp)</th>
                        <th style={{ textAlign: 'right' }}>Saldo Akhir (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((e, idx) => (
                        <tr key={idx}>
                          <td>{e.date}</td>
                          <td>#{e.journal_id}</td>
                          <td>{e.description}</td>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{e.reference || '-'}</td>
                          <td style={{ textAlign: 'right' }}>{e.debit > 0 ? fmtIDR(e.debit) : '-'}</td>
                          <td style={{ textAlign: 'right' }}>{e.credit > 0 ? fmtIDR(e.credit) : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{fmtIDR(e.balance)}</td>
                        </tr>
                      ))}
                      {ledgerEntries.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                            Tidak ada transaksi untuk akun ini pada periode terpilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: NERACA SALDO */}
          {activeSubTab === 'trial_balance' && (
            <div className="section glass">
              <h3 style={{ marginBottom: 16 }}>Neraca Saldo (Trial Balance)</h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kode Akun</th>
                      <th>Nama Akun</th>
                      <th>Tipe Akun</th>
                      <th style={{ textAlign: 'right' }}>Total Debit</th>
                      <th style={{ textAlign: 'right' }}>Total Kredit</th>
                      <th style={{ textAlign: 'right' }}>Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.map(row => (
                      <tr key={row.account_code}>
                        <td style={{ fontWeight: '600' }}>{row.account_code}</td>
                        <td>{row.account_name}</td>
                        <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{getAccountTypeName(row.account_type)}</td>
                        <td style={{ textAlign: 'right' }}>{row.total_debit > 0 ? fmtIDR(row.total_debit) : '-'}</td>
                        <td style={{ textAlign: 'right' }}>{row.total_credit > 0 ? fmtIDR(row.total_credit) : '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: row.balance >= 0 ? '#10b981' : '#ef4444' }}>
                          {fmtIDR(row.balance)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid rgba(255,255,255,0.2)', fontWeight: 'bold', background: 'rgba(255,255,255,0.03)' }}>
                      <td colSpan={3} style={{ textAlign: 'right' }}>TOTAL</td>
                      <td style={{ textAlign: 'right', color: '#a78bfa' }}>
                        {fmtIDR(trialBalance.reduce((s, r) => s + r.total_debit, 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#a78bfa' }}>
                        {fmtIDR(trialBalance.reduce((s, r) => s + r.total_credit, 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>
                        {/* Net balance of all combined accounts should theoretically equal zero */}
                        {fmtIDR(trialBalance.reduce((s, r) => s + r.balance, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: LAPORAN KEUANGAN */}
          {activeSubTab === 'statements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="section glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Laporan Keuangan Fiskal & Komersial</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontSize: 13, color: '#94a3b8' }}>Tahun Laporan:</label>
                    <select value={statementYear} onChange={e => setStatementYear(parseInt(e.target.value))} style={{ width: 90 }}>
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {/* Laporan Posisi Keuangan (Neraca) */}
                <div className="section glass" style={{ flex: 1, minWidth: 350 }}>
                  <h4 style={{ textAlign: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                    Neraca (Balance Sheet)<br />
                    <small style={{ color: '#94a3b8', fontSize: 12 }}>Per 31 Desember {statementYear}</small>
                  </h4>

                  {balanceSheet && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <table className="table" style={{ width: '100%' }}>
                        <tbody>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}><td colSpan={2}><strong>AKTIVA (ASET)</strong></td></tr>
                          {balanceSheet.assets.map(a => (
                            <tr key={a.account_code}>
                              <td style={{ paddingLeft: 16 }}>{a.account_code} - {a.account_name}</td>
                              <td style={{ textAlign: 'right' }}>{fmtIDR(a.balance)}</td>
                            </tr>
                          ))}
                          <tr style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <td>TOTAL AKTIVA</td>
                            <td style={{ textAlign: 'right', color: '#10b981' }}>{fmtIDR(balanceSheet.total_assets)}</td>
                          </tr>

                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}><td colSpan={2}><strong>PASIVA (LIABILITAS & EKUITAS)</strong></td></tr>
                          <tr><td colSpan={2} style={{ paddingLeft: 8, fontSize: 12, color: '#94a3b8' }}>Liabilitas (Kewajiban)</td></tr>
                          {balanceSheet.liabilities.map(l => (
                            <tr key={l.account_code}>
                              <td style={{ paddingLeft: 16 }}>{l.account_code} - {l.account_name}</td>
                              <td style={{ textAlign: 'right' }}>{fmtIDR(Math.abs(l.balance))}</td>
                            </tr>
                          ))}
                          <tr style={{ fontWeight: 'bold' }}>
                            <td style={{ paddingLeft: 8 }}>Total Liabilitas</td>
                            <td style={{ textAlign: 'right' }}>{fmtIDR(balanceSheet.total_liabilities)}</td>
                          </tr>

                          <tr><td colSpan={2} style={{ paddingLeft: 8, fontSize: 12, color: '#94a3b8' }}>Ekuitas (Modal)</td></tr>
                          {balanceSheet.equity.map(e => (
                            <tr key={e.account_code}>
                              <td style={{ paddingLeft: 16 }}>{e.account_code} - {e.account_name}</td>
                              <td style={{ textAlign: 'right' }}>{fmtIDR(Math.abs(e.balance))}</td>
                            </tr>
                          ))}
                          <tr style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <td style={{ paddingLeft: 8 }}>Total Ekuitas</td>
                            <td style={{ textAlign: 'right' }}>{fmtIDR(balanceSheet.total_equity)}</td>
                          </tr>

                          <tr style={{ fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.05)' }}>
                            <td>TOTAL PASIVA (LIABILITAS + EKUITAS)</td>
                            <td style={{ textAlign: 'right', color: '#a78bfa' }}>{fmtIDR(balanceSheet.total_liabilities + balanceSheet.total_equity)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Laporan Laba Rugi Akrual */}
                <div className="section glass" style={{ flex: 1, minWidth: 350 }}>
                  <h4 style={{ textAlign: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                    Laporan Laba Rugi Komersial<br />
                    <small style={{ color: '#94a3b8', fontSize: 12 }}>Periode 1 Jan – 31 Des {statementYear}</small>
                  </h4>

                  {incomeStatement && (
                    <table className="table">
                      <tbody>
                        <tr>
                          <td><strong>PENDAPATAN USAHA</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmtIDR(incomeStatement.total_revenue)}</td>
                        </tr>
                        {incomeStatement.revenue_items.map(r => (
                          <tr key={r.account_code}>
                            <td style={{ paddingLeft: 16, fontSize: 13 }}>{r.account_code} - {r.account_name}</td>
                            <td style={{ textAlign: 'right', fontSize: 13 }}>{fmtIDR(Math.abs(r.balance))}</td>
                          </tr>
                        ))}

                        <tr>
                          <td>Harga Pokok Penjualan (HPP)</td>
                          <td style={{ textAlign: 'right', color: '#ef4444' }}>({fmtIDR(incomeStatement.total_cogs)})</td>
                        </tr>
                        <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                          <td>LABA KOTOR (GROSS PROFIT)</td>
                          <td style={{ textAlign: 'right', color: '#10b981' }}>{fmtIDR(incomeStatement.gross_profit)}</td>
                        </tr>

                        <tr>
                          <td>Beban Operasional</td>
                          <td style={{ textAlign: 'right', color: '#ef4444' }}>({fmtIDR(incomeStatement.total_operating_expense)})</td>
                        </tr>
                        {incomeStatement.expense_items.filter(e => e.account_code.startsWith('6')).map(e => (
                          <tr key={e.account_code}>
                            <td style={{ paddingLeft: 16, fontSize: 13 }}>{e.account_code} - {e.account_name}</td>
                            <td style={{ textAlign: 'right', fontSize: 13 }}>{fmtIDR(Math.abs(e.balance))}</td>
                          </tr>
                        ))}

                        <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                          <td>LABA OPERASIONAL</td>
                          <td style={{ textAlign: 'right', color: '#10b981' }}>{fmtIDR(incomeStatement.operating_profit)}</td>
                        </tr>

                        <tr>
                          <td>Pendapatan / (Beban) Non-Operasional</td>
                          <td style={{ textAlign: 'right' }}>{fmtIDR(incomeStatement.total_other_income_expense)}</td>
                        </tr>

                        <tr style={{ fontWeight: 'bold', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                          <td>LABA SEBELUM PAJAK (EBT)</td>
                          <td style={{ textAlign: 'right' }}>{fmtIDR(incomeStatement.net_profit_before_tax)}</td>
                        </tr>

                        <tr>
                          <td>Beban Pajak Penghasilan (PPh 7200)</td>
                          <td style={{ textAlign: 'right', color: '#ef4444' }}>({fmtIDR(incomeStatement.tax_expense)})</td>
                        </tr>

                        <tr style={{ fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.08)', fontSize: 15 }}>
                          <td>LABA BERSIH SETELAH PAJAK</td>
                          <td style={{ textAlign: 'right', color: '#a78bfa' }}>{fmtIDR(incomeStatement.net_profit_after_tax)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DAFTAR AKUN (CoA) */}
          {activeSubTab === 'coa' && (
            <div className="section glass">
              <h3 style={{ marginBottom: 12 }}>Bagan Akun (Chart of Accounts)</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode Akun</th>
                    <th>Nama Akun</th>
                    <th>Tipe Akun</th>
                    <th>Kode Induk</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.id}>
                      <td style={{ fontWeight: 'bold', color: '#a78bfa' }}>{acc.code}</td>
                      <td style={{ paddingLeft: acc.parent_code ? 20 : 0 }}>
                        {acc.parent_code ? '└─ ' : ''}{acc.name}
                      </td>
                      <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{getAccountTypeName(acc.type)}</td>
                      <td>{acc.parent_code || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
