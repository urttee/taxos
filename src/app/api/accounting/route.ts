// TaxOS — API: Double-Entry Accounting (Journal, Ledger, Financial Statements)
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAccounts, addAccount, createJournalEntry, getJournalEntries,
  deleteJournalEntry, getGeneralLedger, getTrialBalance,
  getBalanceSheet, getIncomeStatement, initializeCoA,
} from '@/lib/accounting-engine';
import type { AccountType } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action') ?? 'accounts';
  const clientId = parseInt(searchParams.get('client_id') ?? '1');

  if (action === 'accounts') {
    return NextResponse.json(await getAccounts(clientId));
  }

  if (action === 'journals') {
    const journals = await getJournalEntries({
      clientId,
      startDate: searchParams.get('start_date') ?? undefined,
      endDate: searchParams.get('end_date') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    });
    return NextResponse.json(journals);
  }

  if (action === 'ledger') {
    const accountCode = searchParams.get('account_code');
    if (!accountCode) return NextResponse.json({ error: 'account_code required' }, { status: 400 });
    const ledger = await getGeneralLedger(accountCode, clientId, {
      startDate: searchParams.get('start_date') ?? undefined,
      endDate: searchParams.get('end_date') ?? undefined,
    });
    return NextResponse.json(ledger);
  }

  if (action === 'trial_balance') {
    return NextResponse.json(await getTrialBalance(clientId, {
      startDate: searchParams.get('start_date') ?? undefined,
      endDate: searchParams.get('end_date') ?? undefined,
    }));
  }

  if (action === 'balance_sheet') {
    const asOf = searchParams.get('as_of') ?? new Date().toISOString().substring(0, 10);
    return NextResponse.json(await getBalanceSheet(clientId, asOf));
  }

  if (action === 'income_statement') {
    const year = searchParams.get('year') ?? '2026';
    return NextResponse.json(await getIncomeStatement(clientId, `${year}-01-01`, `${year}-12-31`));
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const clientId = body.client_id ?? 1;

  if (body.action === 'init_coa') {
    await initializeCoA(clientId);
    return NextResponse.json({ success: true });
  }

  if (body.action === 'add_account') {
    const id = await addAccount({
      code: body.code,
      name: body.name,
      type: body.type as AccountType,
      parentCode: body.parent_code,
      clientId,
    });
    return NextResponse.json({ success: true, id });
  }

  // Create journal entry
  try {
    const id = await createJournalEntry({
      date: body.date,
      description: body.description,
      reference: body.reference,
      lines: body.lines,
      clientId,
    });
    return NextResponse.json({ success: true, id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = parseInt(searchParams.get('id') ?? '0');
  return NextResponse.json({ success: await deleteJournalEntry(id) });
}
