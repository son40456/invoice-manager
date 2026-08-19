import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendConfirmationEmail } from '@/lib/mail';
import { sendNewInvoiceNotification, sendStatusUpdateNotification } from '@/lib/zalo';
import { verifyAdminSession } from '@/lib/auth';

// Public endpoint: Customers submit invoice requests
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Basic input validation & trimming
    const order_id = String(body.order_id || '').trim();
    const tax_id = String(body.tax_id || '').trim();
    const company_name = String(body.company_name || '').trim();
    const address = String(body.address || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();

    if (!order_id || !tax_id || !company_name || !address || !email || !phone) {
      return NextResponse.json({ success: false, error: 'Vui lòng điền đầy đủ tất cả các trường bắt buộc' }, { status: 400 });
    }

    // Add to DB
    const newInvoice = await prisma.invoiceRequest.create({
      data: {
        order_id,
        tax_id,
        company_name,
        address,
        email,
        phone,
      }
    });

    // Send confirmation notifications concurrently
    await Promise.allSettled([
      sendConfirmationEmail(newInvoice),
      sendNewInvoiceNotification(newInvoice)
    ]);

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}

// Protected endpoint: Admin view list of invoice requests
export async function GET(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const invoices = await prisma.invoiceRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// Protected endpoint: Admin update invoice status
export async function PATCH(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const { id, status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing id or status' }, { status: 400 });
    }

    const allowedStatuses = ['pending', 'processed', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const updatedInvoice = await prisma.invoiceRequest.update({
      where: { id },
      data: { status }
    });

    // Gửi Zalo ZNS thông báo cập nhật trạng thái
    await sendStatusUpdateNotification(updatedInvoice, status).catch(console.error);

    return NextResponse.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice status' }, { status: 500 });
  }
}

// Protected endpoint: Admin delete invoice
export async function DELETE(request: Request) {
  try {
    const isAuthed = await verifyAdminSession(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }
    await prisma.invoiceRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete invoice' }, { status: 500 });
  }
}
