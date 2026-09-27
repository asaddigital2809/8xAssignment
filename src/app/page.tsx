"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ReturnIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { ProductRail } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { EmptyView, ErrorView, Spinner } from "@/components/StatusViews";
import { TiltCard } from "@/components/TiltCard";
import type { Category, Product } from "@/domain/types";
import { useCategories, useFeaturedProducts, useProductSearch } from "@/state/catalogQueries";
import { useImageAccent } from "@/state/imageAccent";
import type { AsyncState } from "@/state/useAsync";

// Rails by department, in display order (ids from the seeded catalog).
const DEPARTMENT_RAILS = [
  { id: "smartphones", title: "Latest smartphones" },
  { id: "mobile-accessories", title: "Accessories for your devices" },
  { id: "mens-watches", title: "Watches" },
];

export default function HomePage() {
  return (
    <div className="home-full -mt-5 space-y-5">
      <Hero />
      <div className="relative z-10 -mt-24 sm:-mt-40">
        <CategoryTiles />
      </div>
      <Perks />
      <FeaturedRail />
      {DEPARTMENT_RAILS.map((r) => (
        <DepartmentRail key={r.id} id={r.id} title={r.title} />
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section className="-mx-3 bg-gradient-to-b from-[#37475a] via-[#5b7a8c] to-page px-6 pt-10 pb-32 text-white sm:-mx-4 sm:pb-48 lg:-mx-6">
      <div>
        <p className="text-sm font-medium tracking-wide text-brand uppercase">This week only</p>
        <h1 className="mt-1 max-w-xl text-3xl font-bold sm:text-4xl">New season tech, delivered free</h1>
        <p className="mt-2 max-w-lg text-white/90">Phones, laptops and accessories from top brands. Free delivery on every order and 30-day returns.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/search?category=smartphones" className="rounded-full bg-cta px-5 py-2 font-medium text-gray-900 hover:bg-cta-dark">
            Shop smartphones
          </Link>
          <Link href="/search" className="rounded-full bg-white/15 px-5 py-2 font-medium ring-1 ring-white/40 hover:bg-white/25">
            Browse everything
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoryTiles() {
  const { state, retry } = useCategories();
  if (state.status === "loading") return <Panel><Spinner label="Loading categories…" /></Panel>;
  if (state.status === "error") return <Panel><ErrorView message={state.error.message} onRetry={retry} /></Panel>;
  if (state.data.length === 0) return <Panel><EmptyView title="No categories yet" /></Panel>;

  return (
    <section aria-labelledby="shop-by-category">
      <h2 id="shop-by-category" className="sr-only">
        Shop by category
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {state.data.map((c) => (
          <CategoryTile key={c.id} category={c} />
        ))}
      </div>
    </section>
  );
}

/** Category card tinted with its image's color; the product floats up on hover. */
function CategoryTile({ category: c }: { category: Category }) {
  const palette = useImageAccent(c.image);
  return (
    <TiltCard palette={palette} maxTilt={5} className="h-full">
      <Link href={`/search?category=${c.id}`} className="flex h-full flex-col overflow-hidden rounded-xl outline-offset-4">
        <div
          className="relative aspect-[4/3] transition-[background] duration-500 xl:aspect-[16/10]"
          style={{ background: "linear-gradient(160deg, var(--accent-tint) 0%, var(--accent-soft) 60%, #fff 100%)" }}
        >
          <div className="tile-image absolute inset-4">
            <ProductImage src={c.image} alt="" fill sizes="240px" className="object-contain" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="font-bold">{c.name}</p>
          <span
            aria-hidden
            className="text-lg font-bold text-[var(--accent)] transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}

function Perks() {
  const perks: [ReactNode, string, string][] = [
    [<TruckIcon key="t" />, "Free delivery", "On every order, no minimum"],
    [<ReturnIcon key="r" />, "30-day returns", "Easy returns from your orders page"],
    [<ShieldIcon key="s" />, "Secure checkout", "Card details are never stored"],
  ];
  return (
    <ul className="grid gap-3 rounded-md bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-3">
      {perks.map(([icon, title, body]) => (
        <li key={title} className="flex items-start gap-3">
          <span className="mt-0.5 text-link">{icon}</span>
          <span>
            <span className="block text-sm font-bold">{title}</span>
            <span className="block text-sm text-gray-600">{body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function FeaturedRail() {
  return <Rail title="Top rated" href="/search" query={useFeaturedProducts()} />;
}

function DepartmentRail({ id, title }: { id: string; title: string }) {
  const query = useProductSearch({ categoryId: id });
  return <Rail title={title} href={`/search?category=${id}`} query={query} />;
}

function Rail({ title, href, query }: { title: string; href: string; query: { state: AsyncState<Product[]>; retry: () => void } }) {
  const { state, retry } = query;
  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link href={href} className="text-sm whitespace-nowrap text-link hover:text-[#c7511f] hover:underline">
          See more
        </Link>
      </div>
      {state.status === "loading" && <Spinner label="Loading products…" />}
      {state.status === "error" && <ErrorView message={state.error.message} onRetry={retry} />}
      {state.status === "success" && state.data.length === 0 && <p className="text-sm text-gray-600">Nothing here right now.</p>}
      {state.status === "success" && state.data.length > 0 && <ProductRail products={state.data} listKey={href} />}
    </Panel>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-black/5">{children}</section>;
}
