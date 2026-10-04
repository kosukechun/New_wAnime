import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AccountForm } from "@/components/account-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "アカウント設定" };
export default async function AccountPage() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>アカウント設定</h1>
      <p className="muted">{u.email}</p>
      <AccountForm name={u.name} />
    </div>
  );
}
