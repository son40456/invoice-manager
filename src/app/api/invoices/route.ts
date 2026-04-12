import { NextResponse } from 'next/server';

// In-memory Array to store invoices temporarily.
// Note: This data will be reset when the Next.js server restarts (e.g. Vercel cold boot).
// For permanent storage, replace this with a real Database like Vercel Postgres, Prisma, or Supabase.
let invoices: any[] = [];

export async function GET() {
  return NextResponse.json({ success: true, data: invoices });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Add metadata
    const newInvoice = {
      id: Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      status: 'pending', // pending, processed, rejected
      ...body
    };

    // Store in array (unshift to add to beginning)
    invoices.unshift(newInvoice);

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error('Error saving invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit' }, { status: 500 });
  }
}
