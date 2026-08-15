import { Badge } from "@/components/ui/Badge";
import { ProvenanceLabel } from "@/components/ui/ProvenanceLabel";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product, imageUrl }: { product: Product; imageUrl?: string | null }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="aspect-[4/3] w-full bg-paper-dim">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-medium text-ink">{product.name}</p>
        {product.description && <p className="line-clamp-2 text-sm text-muted">{product.description}</p>}
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-semibold text-ink">{formatPrice(product.price_cents, product.currency)}</span>
          {product.availability === "available" && <Badge tone="verified">Available</Badge>}
          {product.availability === "unavailable" && <Badge tone="danger">Unavailable</Badge>}
          {product.availability === "unknown" && <Badge tone="neutral">Availability unknown</Badge>}
        </div>
        <ProvenanceLabel source={product.price_source} updatedAt={product.price_updated_at} />
      </div>
    </div>
  );
}
