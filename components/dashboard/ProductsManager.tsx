"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ProvenanceLabel } from "@/components/ui/ProvenanceLabel";
import { UploadArea } from "@/components/ui/UploadArea";
import type { BusinessImage, Product } from "@/lib/types";

interface ProductWithImage extends Product {
  imageUrl?: string | null;
}

function toDraft(products: Product[], images: BusinessImage[]): ProductWithImage[] {
  return products.map((p) => ({
    ...p,
    imageUrl: images.find((img) => img.product_id === p.id)?.url ?? null,
  }));
}

export function ProductsManager({
  businessId,
  initialProducts,
  initialImages,
}: {
  businessId: string;
  initialProducts: Product[];
  initialImages: BusinessImage[];
}) {
  const [products, setProducts] = useState<ProductWithImage[]>(toDraft(initialProducts, initialImages));
  const [newProduct, setNewProduct] = useState({ name: "", price: "", availability: "unknown" as Product["availability"], description: "" });
  const [adding, setAdding] = useState(false);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProduct.name.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/business/${businessId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProduct.name,
        description: newProduct.description || undefined,
        price_cents: newProduct.price === "" ? undefined : Math.round(Number(newProduct.price) * 100),
        availability: newProduct.availability,
      }),
    });
    setAdding(false);
    if (res.ok) {
      const data = await res.json();
      setProducts((prev) => [...prev, { ...data.product, imageUrl: null }]);
      setNewProduct({ name: "", price: "", availability: "unknown", description: "" });
    }
  }

  async function saveProduct(id: string, patch: Partial<Product>) {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.product } : p)));
    }
  }

  async function removeProduct(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      {products.map((product) => (
        <ProductRow key={product.id} businessId={businessId} product={product} onSave={saveProduct} onDelete={removeProduct} />
      ))}

      <Card className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Add a product</p>
        <form onSubmit={addProduct} className="space-y-3">
          <Field label="Name">
            <Input required value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₦)" hint="Leave blank if unknown.">
              <Input
                type="number"
                min={0}
                value={newProduct.price}
                onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
              />
            </Field>
            <Field label="Availability">
              <Select
                value={newProduct.availability}
                onChange={(e) => setNewProduct((p) => ({ ...p, availability: e.target.value as Product["availability"] }))}
              >
                <option value="unknown">Unknown</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              rows={2}
              value={newProduct.description}
              onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
            />
          </Field>
          <Button type="submit" disabled={adding}>
            {adding ? "Adding…" : "Add product"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function ProductRow({
  businessId,
  product,
  onSave,
  onDelete,
}: {
  businessId: string;
  product: ProductWithImage;
  onSave: (id: string, patch: Partial<Product>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price_cents !== null ? String(product.price_cents / 100) : "");
  const [availability, setAvailability] = useState(product.availability);
  const [description, setDescription] = useState(product.description ?? "");
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(product.id, {
      name,
      description,
      price_cents: price === "" ? null : Math.round(Number(price) * 100),
      availability,
    });
    setSaving(false);
  }

  return (
    <Card className="space-y-3">
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
          ) : (
            <UploadArea businessId={businessId} productId={product.id} isPrimary label="Photo" onUploaded={setImageUrl} />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Field label="Price (₦)">
                <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <div className="mt-1">
                <ProvenanceLabel source={product.price_source} updatedAt={product.price_updated_at} />
              </div>
            </div>
            <div>
              <Field label="Availability">
                <Select value={availability} onChange={(e) => setAvailability(e.target.value as Product["availability"])}>
                  <option value="unknown">Unknown</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </Select>
              </Field>
              <div className="mt-1">
                <ProvenanceLabel source={product.availability_source} updatedAt={product.availability_updated_at} />
              </div>
            </div>
          </div>
          <Field label="Description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button size="md" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="md" variant="ghost" onClick={() => onDelete(product.id)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
