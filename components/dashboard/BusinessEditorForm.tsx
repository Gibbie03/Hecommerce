"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { ProvenanceLabel } from "@/components/ui/ProvenanceLabel";
import { UploadArea } from "@/components/ui/UploadArea";
import { Card } from "@/components/ui/Card";
import { ORDERED_DAY_KEYS, DAY_LABELS } from "@/lib/business/hours";
import type { Business, OpeningHours, OpeningHoursDay } from "@/lib/types";

const DEFAULT_DAY: OpeningHoursDay = { open: "09:00", close: "21:00", closed: true };

export function BusinessEditorForm({ business, logoUrl }: { business: Business; logoUrl: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(business.name);
  const [category, setCategory] = useState(business.category ?? "");
  const [description, setDescription] = useState(business.description ?? "");
  const [phone, setPhone] = useState(business.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(business.whatsapp ?? "");
  const [email, setEmail] = useState(business.email ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [city, setCity] = useState(business.city ?? "");
  const [state, setState] = useState(business.state ?? "");
  const [policies, setPolicies] = useState(business.policies ?? "");
  const [hours, setHours] = useState<OpeningHours>(business.opening_hours ?? {});
  const [deliveryAvailable, setDeliveryAvailable] = useState<"unknown" | "yes" | "no">(
    business.delivery_info?.available === true ? "yes" : business.delivery_info?.available === false ? "no" : "unknown",
  );
  const [logo, setLogo] = useState(logoUrl);
  const [status, setStatus] = useState<"idle" | "saving" | "publishing">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const provenance = business.field_provenance ?? {};
  const hasImported = Object.values(provenance).some((f) => f?.source === "imported");

  function updateDay(day: (typeof ORDERED_DAY_KEYS)[number], patch: Partial<OpeningHoursDay>) {
    setHours((prev) => ({ ...prev, [day]: { ...(prev[day] ?? DEFAULT_DAY), ...patch } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);
    const res = await fetch(`/api/business/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        description,
        phone,
        whatsapp,
        email: email || undefined,
        address,
        city,
        state,
        policies,
        opening_hours: hours,
        delivery_info: deliveryAvailable === "unknown" ? undefined : { available: deliveryAvailable === "yes" },
      }),
    });
    setStatus("idle");
    if (res.ok) {
      setMessage("Saved.");
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Something went wrong.");
    }
  }

  async function handleConfirmImported() {
    await fetch(`/api/business/${business.id}/confirm-imported`, { method: "POST" });
    router.refresh();
  }

  async function handlePublish() {
    setStatus("publishing");
    const res = await fetch(`/api/business/${business.id}/publish`, { method: "POST" });
    setStatus("idle");
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-6 space-y-10">
      {hasImported && (
        <Card className="flex items-center justify-between bg-paper-dim/60">
          <p className="text-sm text-ink">Some information was imported from your website. Does it look right?</p>
          <Button type="button" size="md" variant="secondary" onClick={handleConfirmImported}>
            Confirm imported info
          </Button>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Business</h2>
        <div>
          <UploadArea businessId={business.id} isPrimary label="Business logo / photo" onUploaded={setLogo} />
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="mt-3 h-20 w-20 rounded-xl object-cover" />
          )}
        </div>
        <Field label="Business name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <div>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
          {provenance.description && (
            <div className="mt-1">
              <ProvenanceLabel source={provenance.description.source} updatedAt={provenance.description.updated_at} />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Contact</h2>
        <div>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          {provenance.phone && (
            <div className="mt-1">
              <ProvenanceLabel source={provenance.phone.source} updatedAt={provenance.phone.updated_at} />
            </div>
          )}
        </div>
        <Field label="WhatsApp">
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Location</h2>
        <div>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          {provenance.address && (
            <div className="mt-1">
              <ProvenanceLabel source={provenance.address.source} updatedAt={provenance.address.updated_at} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="State">
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Opening hours</h2>
        <div className="space-y-2">
          {ORDERED_DAY_KEYS.map((day) => {
            const value = hours[day] ?? DEFAULT_DAY;
            return (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 text-sm text-ink">{DAY_LABELS[day]}</span>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={!value.closed}
                    onChange={(e) => updateDay(day, { closed: !e.target.checked })}
                  />
                  Open
                </label>
                {!value.closed && (
                  <>
                    <input
                      type="time"
                      value={value.open}
                      onChange={(e) => updateDay(day, { open: e.target.value })}
                      className="rounded-lg border border-line px-2 py-1 text-sm"
                    />
                    <span className="text-muted">–</span>
                    <input
                      type="time"
                      value={value.close}
                      onChange={(e) => updateDay(day, { close: e.target.value })}
                      className="rounded-lg border border-line px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Delivery</h2>
        <Field label="Do you offer delivery?">
          <Select value={deliveryAvailable} onChange={(e) => setDeliveryAvailable(e.target.value as typeof deliveryAvailable)}>
            <option value="unknown">Not sure yet</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Policies</h2>
        <Field label="Store policies" hint="Refunds, order lead time, anything customers should know.">
          <Textarea value={policies} onChange={(e) => setPolicies(e.target.value)} rows={3} />
        </Field>
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status !== "idle"}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </Button>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>

      {business.status === "draft" && (
        <Card className="flex items-center justify-between border-forest/30 bg-verified-bg">
          <div>
            <p className="font-medium text-ink">Ready to go live?</p>
            <p className="text-sm text-muted">Publishing makes your business site and AI data public.</p>
          </div>
          <Button type="button" onClick={handlePublish} disabled={status !== "idle"}>
            {status === "publishing" ? "Publishing…" : "Publish business"}
          </Button>
        </Card>
      )}
    </form>
  );
}
