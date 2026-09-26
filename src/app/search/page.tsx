"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/ProductCard";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { useCategories, useProductSearch } from "@/state/catalogQueries";

export default function SearchPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SearchResults />
    </Suspense>
  );
}

function SearchResults() {
  const params = useSearchParams();
  const text = params.get("q") ?? "";
  const categoryId = params.get("category") ?? "";
  const { state, retry } = useProductSearch({ text, categoryId });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg">
          {text ? (
            <>
              Results for <span className="font-semibold">“{text}”</span>
            </>
          ) : (
            "All products"
          )}
          {state.status === "success" && <span className="text-gray-500"> · {state.data.length} items</span>}
        </h1>
        <CategoryFilter selected={categoryId} />
      </div>

      {state.status === "loading" && <Spinner label="Searching…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyView title="No results" action={{ href: "/search", label: "See all products" }}>
          Try a different search term{categoryId && " or clear the category filter"}.
        </EmptyView>
      )}
      {state.status === "success" && state.data.length > 0 && <ProductGrid products={state.data} />}
    </div>
  );
}

function CategoryFilter({ selected }: { selected: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { state } = useCategories();

  function onChange(categoryId: string) {
    const next = new URLSearchParams(params);
    if (categoryId) next.set("category", categoryId);
    else next.delete("category");
    router.push(`/search?${next}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      Category
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={state.status !== "success"}
        className="rounded border border-gray-300 bg-white px-2 py-1.5"
      >
        <option value="">{state.status === "error" ? "Couldn't load categories" : "All"}</option>
        {state.status === "success" &&
          state.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
    </label>
  );
}
