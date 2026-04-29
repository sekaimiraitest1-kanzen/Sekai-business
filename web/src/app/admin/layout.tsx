import "@/styles/legacy-admin.css";
import "@/styles/admin-shell.css";
import "@/styles/admin-statistike.css";
import "@/styles/admin-termini.css";
import { InstallPrompt } from "@/components/install-prompt";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm-root">
      {children}
      <InstallPrompt />
    </div>
  );
}
