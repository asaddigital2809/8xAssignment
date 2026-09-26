"use client";

import { ProductImage } from "@/components/ProductImage";
import Link from "next/link";
import { ProductRail } from "@/components/ProductCard";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { useCategories, useFeaturedProducts } from "@/state/catalogQueries";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Shop by category</h2>
        <CategoryTiles />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Top rated</h2>
        <FeaturedRail />
      </section>
    </div>
  );
}

function CategoryTiles() {
  const { state, retry } = useCategories();
  if (state.status === "loading") return <Spinner label="Loading categories…" />;
  if (state.status === "error") return <ErrorView message={state.error.message} onRetry={retry} />;
  if (state.data.length === 0) return <EmptyView title="No categories yet" />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {state.data.map((c) => (
        <Link key={c.id} href={`/search?category=${c.id}`} className="rounded bg-white p-3 shadow-sm hover:shadow">
          <p className="font-medium">{c.name}</p>
          <div className="relative mt-2 aspect-[4/3]">
            <ProductImage src={c.image} alt="" fill sizes="200px" className="object-contain" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function FeaturedRail() {
  const { state, retry } = useFeaturedProducts();
  if (state.status === "loading") return <Spinner label="Loading products…" />;
  if (state.status === "error") return <ErrorView message={state.error.message} onRetry={retry} />;
  if (state.data.length === 0) return <EmptyView title="Nothing featured right now" />;
  return <ProductRail products={state.data} />;
}
