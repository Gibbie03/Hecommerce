import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { getMemberReviews } from "@/lib/business/queries";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/format";

export default async function ReviewsPage() {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  const reviews = await getMemberReviews(business.id, session.userId);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Reviews</h1>
      <p className="mt-1 text-sm text-muted">What customers say, shown on your public business site.</p>

      <div className="mt-6 space-y-4">
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet" description="Reviews from customers will appear here once you have some." />
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{review.author_name}</p>
                <span className="text-sm text-amber">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              </div>
              {review.body && <p className="mt-1.5 text-sm text-muted">{review.body}</p>}
              <p className="mt-2 text-xs text-muted">{formatRelativeTime(review.created_at)}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
