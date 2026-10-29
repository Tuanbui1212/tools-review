import type { User } from "../types";

function initials(user: Pick<User, "display_name" | "username">): string {
  const source = (user.display_name || user.username).trim();
  const words = source.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export function UserAvatar({
  user,
  size = "md",
}: {
  user: Pick<User, "display_name" | "username" | "system_role">;
  size?: "sm" | "md";
}) {
  const classes = ["crt-avatar", `crt-avatar--${user.system_role}`];
  if (size === "sm") classes.push("crt-avatar--sm");
  return (
    <span className={classes.join(" ")} aria-hidden="true">
      {initials(user)}
    </span>
  );
}
