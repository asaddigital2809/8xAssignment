import { requireUser } from "@/server/dal";
import { AddressBook } from "./AddressBook";

export default async function AddressesPage() {
  await requireUser("/account/addresses");
  return <AddressBook />;
}
