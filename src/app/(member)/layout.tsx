"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "ホーム", icon: "🏠" },
  { href: "/records", label: "記録", icon: "📋" },
  { href: "/photos", label: "写真", icon: "📸" },
  { href: "/weight", label: "体重", icon: "⚖️" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold">Piste</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white safe-bottom">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
                pathname.startsWith(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
