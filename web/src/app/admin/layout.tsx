import "@/styles/legacy-admin.css";
import "@/styles/admin-shell.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm-root">{children}</div>;
}
