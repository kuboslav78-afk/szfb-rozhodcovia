import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ProfileDetailsForm } from "@/components/ProfileDetailsForm";
import { PhotoUpload } from "@/components/PhotoUpload";
import { CriminalRecordUpload } from "@/components/CriminalRecordUpload";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin } from "@/lib/view-mode";
import { isTestingEnabled } from "@/lib/settings";
import { LICENSE_LABELS, isLicenseLevel } from "@/lib/licenses";
import { CATEGORY_LABELS, isCategory } from "@/lib/categories";
import { CONTRACT_LABELS, isContractType } from "@/lib/contracts";

export default async function ProfilPage() {
  const referee = await requireUser();
  const supabase = await createClient();
  const testingEnabled = await isTestingEnabled(supabase);
  const realIsAdmin = referee.role === "admin";
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  const { data: refereeRow } = await supabase
    .from("referees")
    .select(
      "phone, license_level, home_region, address, date_of_birth, birth_number, bank_account, jersey_size, shorts_size, socks_size, photo_path, criminal_record_path, criminal_record_uploaded_at, contract_type, contract_number",
    )
    .eq("id", referee.id)
    .maybeSingle();

  const [photoSigned, criminalRecordSigned] = await Promise.all([
    refereeRow?.photo_path
      ? supabase.storage.from("referee-photos").createSignedUrl(refereeRow.photo_path, 60 * 60)
      : Promise.resolve({ data: null }),
    refereeRow?.criminal_record_path
      ? supabase.storage.from("referee-documents").createSignedUrl(refereeRow.criminal_record_path, 60 * 5)
      : Promise.resolve({ data: null }),
  ]);

  const licenseLevel = refereeRow?.license_level;
  const licenseLabel = licenseLevel && isLicenseLevel(licenseLevel) ? LICENSE_LABELS[licenseLevel] : null;
  const contractType = refereeRow?.contract_type;
  const contractLabel =
    contractType && isContractType(contractType) ? CONTRACT_LABELS[contractType] : null;
  const homeRegion = refereeRow?.home_region;
  const homeRegionLabel = homeRegion && isCategory(homeRegion) ? CATEGORY_LABELS[homeRegion] : null;

  return (
    <div className="lg:flex">
      <Sidebar
        current={null}
        refereeName={referee.full_name}
        roleLabel={
          realIsAdmin
            ? isSuperAdmin
              ? "Administrátor"
              : "Administrátor · náhľad rozhodcu"
            : referee.role === "viewer"
              ? "Viewer"
              : null
        }
        isAdmin={isSuperAdmin}
        canSeeKro={isSuperAdmin || referee.role === "viewer"}
        pendingNominations={pendingNominations}
        canToggleView={realIsAdmin}
        viewMode={isSuperAdmin ? "admin" : "referee"}
        testingEnabled={testingEnabled}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
          <div>
            <Link
              href="/dostupnost"
              className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              ← Späť na kalendár
            </Link>
            <PageTitle>Môj profil</PageTitle>
          </div>

          <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <PhotoUpload refereeId={referee.id} photoUrl={photoSigned.data?.signedUrl ?? null} />

            <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-5 text-sm dark:border-zinc-900">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Meno</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">{referee.full_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">E-mail</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">{referee.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Licencia</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                  {licenseLabel ? `${licenseLevel} · ${licenseLabel}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Domáci región</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">{homeRegionLabel ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Zmluva</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                  {contractLabel
                    ? `${contractLabel}${refereeRow?.contract_number ? ` · č. ${refereeRow.contract_number}` : ""}`
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <ProfileDetailsForm
            details={{
              phone: refereeRow?.phone ?? null,
              address: refereeRow?.address ?? null,
              dateOfBirth: refereeRow?.date_of_birth ?? null,
              birthNumber: refereeRow?.birth_number ?? null,
              bankAccount: refereeRow?.bank_account ?? null,
              jerseySize: refereeRow?.jersey_size ?? null,
              shortsSize: refereeRow?.shorts_size ?? null,
              socksSize: refereeRow?.socks_size ?? null,
            }}
          />

          <CriminalRecordUpload
            refereeId={referee.id}
            uploadedAt={refereeRow?.criminal_record_uploaded_at ?? null}
            downloadUrl={criminalRecordSigned.data?.signedUrl ?? null}
          />

          <ChangePasswordForm />
        </main>
      </div>
    </div>
  );
}
