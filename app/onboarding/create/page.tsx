"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { saveDraft, type DraftProduct } from "@/lib/onboarding/draft";
import { ORDERED_DAY_KEYS, DAY_LABELS } from "@/lib/business/hours";
import type { OpeningHours, OpeningHoursDay } from "@/lib/types";

const DEFAULT_DAY: OpeningHoursDay = { open: "09:00", close: "21:00", closed: false };

function emptyProduct(): DraftProduct {
  return { name: "", description: "", availability: "unknown" };
}

export default function CreateBusinessPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [hours, setHours] = useState<OpeningHours>(
    Object.fromEntries(ORDERED_DAY_KEYS.map((d) => [d, { ...DEFAULT_DAY }])) as OpeningHours,
  );
  const [products, setProducts] = useState<DraftProduct[]>([emptyProduct()]);
  const [deliveryAvailable, setDeliveryAvailable] = useState<"unknown" | "yes" | "no">("unknown");

  function updateDay(day: (typeof ORDERED_DAY_KEYS)[number], patch: Partial<OpeningHoursDay>) {
    setHours((prev) => ({ ...prev, [day]: { ...(prev[day] ?? DEFAULT_DAY), ...patch } }));
  }

  function updateProduct(index: number, patch: Partial<DraftProduct>) {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveDraft({
      source: "manual",
      business: {
        name,
        category: category || undefined,
        description: description || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        opening_hours: hours,
        delivery_info:
          deliveryAvailable === "unknown"
            ? undefined
            : { available: deliveryAvailable === "yes" },
      },
      products: products
        .filter((p) => p.name.trim())
        .map((p) => ({ ...p, price_cents: p.price_cents })),
    });
    router.push("/claim");
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="text-sm font-medium text-forest">Icommerce</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Let&apos;s create your business site.</h1>
      <p className="mt-2 text-muted">
        You don&apos;t need a website to become AI-ready. We&apos;ll create one for your business.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Business</h2>
          <Field label="Business name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Oooh Lala Shawarma" />
          </Field>
          <Field label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Shawarma Restaurant" />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Contact</h2>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 803 000 1122" />
          </Field>
          <Field label="WhatsApp">
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 803 000 1122" />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Location</h2>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
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

        <section className="space-y-3">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Products &amp; services</h2>
          <div className="space-y-4">
            {products.map((product, i) => (
              <Card key={i} className="space-y-3">
                <Field label="Name">
                  <Input
                    value={product.name}
                    onChange={(e) => updateProduct(i, { name: e.target.value })}
                    placeholder="Chicken Shawarma"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price (₦)" hint="Leave blank if unknown — never guess.">
                    <Input
                      type="number"
                      min={0}
                      value={product.price_cents !== undefined ? product.price_cents / 100 : ""}
                      onChange={(e) =>
                        updateProduct(i, {
                          price_cents: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100),
                        })
                      }
                    />
                  </Field>
                  <Field label="Availability">
                    <Select
                      value={product.availability ?? "unknown"}
                      onChange={(e) => updateProduct(i, { availability: e.target.value as DraftProduct["availability"] })}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea
                    value={product.description ?? ""}
                    onChange={(e) => updateProduct(i, { description: e.target.value })}
                    rows={2}
                  />
                </Field>
                {products.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </Button>
                )}
              </Card>
            ))}
            <Button type="button" variant="secondary" onClick={() => setProducts((prev) => [...prev, emptyProduct()])}>
              + Add another product
            </Button>
          </div>
          <p className="text-xs text-muted">
            You can add photos for these once your business is created — from your phone or computer.
          </p>
        </section>

        <Button type="submit" size="lg" className="w-full">
          Continue
        </Button>
      </form>
    </main>
  );
}
