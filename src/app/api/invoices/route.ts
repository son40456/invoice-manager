import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendConfirmationEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Add to DB
    const newInvoice = await prisma.invoiceRequest.create({
      data: {
        order_id: body.order_id,
        tax_id: body.tax_id,
        company_name: body.company_name,
        address: body.address,
        email: body.email,
        phone: body.phone,
      }
    });

    // Bắn Email xác nhận ngầm (Không block trình duyệt của khách quá lâu)
    sendConfirmationEmail(newInvoice).catch(console.error);

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const invoices = await prisma.invoiceRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing id or status' }, { status: 400 });
    }

    const updatedInvoice = await prisma.invoiceRequest.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice status' }, { status: 500 });
  }
}
