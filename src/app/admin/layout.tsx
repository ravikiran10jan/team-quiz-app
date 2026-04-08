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
        <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="font-semibold text-zinc-50 hover:text-indigo-400 transition-colors">
                Quiz Battle Admin
              </Link>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors" target="_blank">
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
