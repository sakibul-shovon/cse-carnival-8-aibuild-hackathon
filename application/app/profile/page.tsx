import { AuthGate } from '@/components/auth-gate';

export default function ProfilePage() {
  return <AuthGate initialProfile />;
}
