/** Dải phim chạy ngang, dùng làm viền trang trí. */
export function FilmStrip({
  position,
  reverse = false,
}: {
  position: "top" | "bottom";
  reverse?: boolean;
}) {
  const classes = ["crt-filmstrip", `crt-filmstrip--${position}`];
  if (reverse) classes.push("crt-filmstrip--reverse");
  return <div className={classes.join(" ")} aria-hidden="true" />;
}
