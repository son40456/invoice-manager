import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminSessionToken } from '@/lib/auth';
import AdminLoginForm from './AdminLoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  const isValid = await verifyAdminSessionToken(token);

  if (isValid) {
    redirect('/admin');
  }

  return <AdminLoginForm />;
}
