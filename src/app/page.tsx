import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-black px-4 text-center">
      <h1 className="text-3xl font-semibold">Game Site</h1>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-900"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
