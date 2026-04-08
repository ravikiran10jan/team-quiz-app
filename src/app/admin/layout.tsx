import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const isAuthenticated = token ? verifyAdminToken(token) : false;

  return (
    <div className="flex-1 flex flex-col">
      {isAuthenticated && (
        <nav className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="font-bold text-purple-400 hover:text-purple-300 transition-colors">
                Quiz Battle Admin
              </Link>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors" target="_blank">
                Player View
              </Link>
            </div>
          </div>
        </nav>
      )}
      {children}
    </div>
  );
}
