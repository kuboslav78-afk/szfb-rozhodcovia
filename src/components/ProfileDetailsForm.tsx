"use client";

import { FormEvent, useState } from "react";
import { updateMyProfile } from "@/app/profil/actions";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export type ProfileDetails = {
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  birthNumber: string | null;
  bankAccount: string | null;
  jerseySize: string | null;
  shortsSize: string | null;
  socksSize: string | null;
};

function SizeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        <option value="">— nevybraté —</option>
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </div>
  );
}

export function ProfileDetailsForm({ details }: { details: ProfileDetails }) {
  const [phone, setPhone] = useState(details.phone ?? "");
  const [address, setAddress] = useState(details.address ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(details.dateOfBirth ?? "");
  const [birthNumber, setBirthNumber] = useState(details.birthNumber ?? "");
  const [bankAccount, setBankAccount] = useState(details.bankAccount ?? "");
  const [jerseySize, setJerseySize] = useState(details.jerseySize ?? "");
  const [shortsSize, setShortsSize] = useState(details.shortsSize ?? "");
  const [socksSize, setSocksSize] = useState(details.socksSize ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await updateMyProfile({
        phone,
        address,
        dateOfBirth,
        birthNumber,
        bankAccount,
        jerseySize,
        shortsSize,
        socksSize,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa uložiť.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Osobné a zmluvné údaje</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Potrebné pre rámcovú príkaznú zmluvu a výplaty. Vyplň, čo máš k dispozícii.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Telefón" value={phone} onChange={setPhone} type="tel" placeholder="+421 9XX XXX XXX" />
          <TextField label="Dátum narodenia" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
        </div>

        <TextField label="Adresa" value={address} onChange={setAddress} placeholder="Ulica 12, 811 01 Bratislava" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Rodné číslo" value={birthNumber} onChange={setBirthNumber} placeholder="XXXXXX/XXXX" />
          <TextField
            label="Číslo účtu (IBAN)"
            value={bankAccount}
            onChange={setBankAccount}
            placeholder="SK00 0000 0000 0000 0000 0000"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SizeSelect label="Veľkosť dresu" value={jerseySize} onChange={setJerseySize} />
          <SizeSelect label="Veľkosť trenírok" value={shortsSize} onChange={setShortsSize} />
          <SizeSelect label="Veľkosť štucní" value={socksSize} onChange={setSocksSize} />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Uložené.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ukladám…" : "Uložiť údaje"}
        </button>
      </form>
    </div>
  );
}
