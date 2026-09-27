"use client";

import Link from "next/link";
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
  const categories = useCategories();
  const categoryName = categories.state.status === "success" ? categories.state.data.find((c) => c.id === categoryId)?.name : undefined;

  return (
    <div className="-mt-5">
      <div className="-mx-3 mb-4 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-2.5 shadow-sm sm:-mx-4">
        <h1 className="text-sm">
          {state.status === "success" ? (
            <>
              {state.data.length > 0 ? `1-${state.data.length} of ${state.data.length}` : "No"} results
              {text && (
                <>
                  {" "}
                  for <span className="font-bold text-[#c7511f]">“{text}”</span>
                </>
              )}
              {categoryName && <> in {categoryName}</>}
            </>
          ) : (
            "Searching…"
          )}
        </h1>
        <div className="md:hidden">
          <CategorySelect selected={categoryId} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        <aside className="hidden md:block">
          <DepartmentList selected={categoryId} />
        </aside>
        <section aria-label="Results">
          {state.status === "loading" && <Spinner label="Searching…" />}
          {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
          {state.status === "success" && state.data.length === 0 && (
            <EmptyView title="No results" action={{ href: "/search", label: "See all products" }}>
              Try a different search term{categoryId && " or another department"}.
            </EmptyView>
          )}
          {state.status === "success" && state.data.length > 0 && <ProductGrid products={state.data} />}
        </section>
      </div>
    </div>
  );
}

/** Desktop: the category filter as a department list (keeps the search text). */
function DepartmentList({ selected }: { selected: string }) {
  const params = useSearchParams();
  const { state } = useCategories();
  const href = (categoryId: string) => {
    const next = new URLSearchParams(params);
    if (categoryId) next.set("category", categoryId);
    else next.delete("category");
    return `/search${next.size ? `?${next}` : ""}`;
  };
  return (
    <nav aria-label="Department" className="text-sm">
      <p className="mb-2 font-bold">Department</p>
      {state.status === "error" && <p className="text-gray-500">Couldn&apos;t load departments.</p>}
      <ul className="space-y-1.5">
        <li>
          <Link href={href("")} aria-current={!selected ? "page" : undefined} className="hover:text-[#c7511f] aria-[current=page]:font-bold">
            All departments
          </Link>
        </li>
        {state.status === "success" &&
          state.data.map((c) => (
            <li key={c.id}>
              <Link href={href(c.id)} aria-current={selected === c.id ? "page" : undefined} className="hover:text-[#c7511f] aria-[current=page]:font-bold">
                {c.name}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}

/** Small screens: the same filter as a dropdown. */
function CategorySelect({ selected }: { selected: string }) {
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
      Department
      <select
        name="categoryFilter"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={state.status !== "success"}
        className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5"
      >
        <option value="">{state.status === "error" ? "Couldn't load" : "All"}</option>
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
