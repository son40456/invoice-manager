import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyAdminSessionToken, getAdminSecretPath } from '@/lib/auth';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ adminSecretPath: string }>;
}

export default async function DynamicAdminPage({ params }: PageProps) {
  const { adminSecretPath } = await params;
  const configuredSecretSlug = getAdminSecretPath().replace(/^\//, '');

  // If path doesn't match configured ADMIN_SECRET_PATH -> Return 404 Not Found
  if (adminSecretPath !== configuredSecretSlug) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  const isValid = await verifyAdminSessionToken(token);

  if (!isValid) {
    redirect(`/${configuredSecretSlug}/login`);
  }

  return <AdminDashboard adminPath={`/${configuredSecretSlug}`} />;
}
