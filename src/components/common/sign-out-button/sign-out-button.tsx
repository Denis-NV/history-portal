import { signOutAction } from "@/components/auth/actions";
import { Button } from "@/components/shadcn/button";

export const SignOutButton = () => {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost">
        Sign Out
      </Button>
    </form>
  );
};
