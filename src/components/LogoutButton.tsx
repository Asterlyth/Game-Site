import { logout } from "@/app/dashboard/actions";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-900"
      >
        Log out
      </button>
    </form>
  );
}
