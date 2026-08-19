import { notFound } from 'next/navigation';
import { getAdminSecretPath } from '@/lib/auth';
import AdminLoginForm from './AdminLoginForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ adminSecretPath: string }>;
}

export default async function DynamicLoginPage({ params }: PageProps) {
  const { adminSecretPath } = await params;
  const configuredSecretSlug = getAdminSecretPath().replace(/^\//, '');

  if (adminSecretPath !== configuredSecretSlug) {
    notFound();
  }

  return <AdminLoginForm adminPath={`/${configuredSecretSlug}`} />;
}
