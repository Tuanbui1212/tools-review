import type { CSSProperties, ReactNode } from "react";

import { BrandLogo } from "../../../ui/BrandLogo";
import { FilmStrip } from "../../../ui/FilmStrip";
import { FilmIcon, MicIcon, ScanIcon, ScriptIcon } from "../../../ui/icons";

const PIPELINE = [
  { icon: <ScanIcon />, title: "Nhận diện", text: "Panel, lời thoại, nhân vật" },
  { icon: <ScriptIcon />, title: "Kịch bản", text: "AI viết, bám sát cốt truyện" },
  { icon: <MicIcon />, title: "Giọng đọc", text: "Nhiều giọng, đúng cảm xúc" },
  { icon: <FilmIcon />, title: "Dựng phim", text: "Chuyển cảnh khớp lời đọc" },
];

/** Màn hình đăng nhập kiểu phòng dựng phim, dùng chung Web và App. */
export function AuthScreen({ tagline, children }: { tagline: string; children: ReactNode }) {
  return (
    <div className="crt-auth crt-grain">
      <div className="crt-spotlight crt-spotlight--a" />
      <div className="crt-spotlight crt-spotlight--b" />
      <div className="crt-spotlight crt-spotlight--c" />
      <FilmStrip position="top" />
      <FilmStrip position="bottom" reverse />

      <div className="crt-auth__inner">
        <section className="crt-auth__hero">
          <BrandLogo size="lg" tagline={tagline} />
          <h1 className="crt-auth__title">
            Biến <span className="crt-gradient-text">truyện tranh</span>
            <br />
            thành video review
          </h1>
          <p className="crt-auth__lead">
            Nạp ảnh chapter, studio tự nhận diện, viết kịch bản, tạo giọng đọc và dựng thành video
            hoàn chỉnh — bạn chỉ cần duyệt.
          </p>
          <ul className="crt-pipeline">
            {PIPELINE.map((step, index) => (
              <li key={step.title} style={{ "--i": index } as CSSProperties}>
                <span className="crt-pipeline__icon">{step.icon}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="crt-card crt-auth__panel">
          <div className="crt-eyebrow">Studio · {tagline}</div>
          <h2>Đăng nhập</h2>
          <p className="crt-muted">Chào mừng trở lại phòng dựng.</p>
          {children}
        </section>
      </div>
    </div>
  );
}
