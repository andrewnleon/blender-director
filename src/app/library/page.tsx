import { redirect } from "next/navigation";

/** Library merged into root — keep route for old links. */
export default function LibraryPage() {
  redirect("/");
}
