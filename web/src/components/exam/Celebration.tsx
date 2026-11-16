"use client";

import { PartyPopper, ThumbsUp, Trophy } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import type { CelebrationLevel } from "@/lib/examStats";
import { formatScore } from "@/lib/scoring";

type Props = { level: CelebrationLevel; score: number; maxScore: number; onClose: () => void };

const CONTENT: Record<CelebrationLevel, { title: string; line: string; Icon: typeof Trophy; size: string }> = {
  good: { title: "Chúc mừng", line: "Làm tốt lắm", Icon: ThumbsUp, size: "size-14" },
  great: { title: "Xuất sắc", line: "Kết quả rất cao", Icon: PartyPopper, size: "size-20" },
  perfect: { title: "Điểm tuyệt đối", line: "Không sai câu nào", Icon: Trophy, size: "size-24" },
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; fade: number; color: string; size: number; spin: number; angle: number };

// mức mạnh rắc giấy màu từ trên xuống một đợt, mức trọn điểm bắn pháo hoa liên tục cho tới khi đóng hộp thoại
function Sparks({ mode }: { mode: "confetti" | "fireworks" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  // canvas và vòng lặp vẽ là hệ ngoài: dựng khi hiện, gỡ khi đóng
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // màu lấy từ token của giao diện đang dùng, không viết mã màu trong component
    const styles = getComputedStyle(document.documentElement);
    const colors = ["--brand", "--live", "--soon", "--flag", "--series-vsat", "--series-thpt"].map((name) => styles.getPropertyValue(name).trim()).filter(Boolean);
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    // mỗi màu vẽ sẵn một đốm sáng có quầng, lúc chạy chỉ dán ảnh; toả quầng bằng shadowBlur cho từng hạt làm máy giật
    const sprites = new Map(
      colors.map((color) => {
        const dot = document.createElement("canvas");
        dot.width = dot.height = 32;
        const pen = dot.getContext("2d")!;
        const glow = pen.createRadialGradient(16, 16, 0, 16, 16, 16);
        glow.addColorStop(0, "white");
        glow.addColorStop(0.38, color);
        glow.addColorStop(1, "transparent");
        pen.fillStyle = glow;
        pen.fillRect(0, 0, 32, 32);
        return [color, dot] as const;
      }),
    );
    const fit = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit);

    let particles: Particle[] = [];
    const burst = () => {
      // giữ số hạt trong tầm máy yếu vẫn vẽ kịp
      if (particles.length > 600) return;
      const x = canvas.width * (0.12 + Math.random() * 0.76);
      const y = canvas.height * (0.1 + Math.random() * 0.45);
      const color = pick();
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 7.5;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, fade: 0.011 + Math.random() * 0.012, color: Math.random() < 0.8 ? color : pick(), size: 9 + Math.random() * 9, spin: 0, angle: 0 });
      }
    };
    const rain = (count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({ x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.4, vx: -1.2 + Math.random() * 2.4, vy: 2.2 + Math.random() * 3.2, life: 1, fade: 0.0035, color: pick(), size: 6 + Math.random() * 6, spin: -0.2 + Math.random() * 0.4, angle: Math.random() * Math.PI });
      }
    };

    if (mode === "confetti") rain(140);
    else for (let i = 0; i < 4; i++) burst();
    const timer = mode === "fireworks" ? setInterval(burst, 380) : null;
    // bắn trong 7 giây rồi thôi, hộp thoại để mở lâu cũng không ngốn máy mãi
    const stop = setTimeout(() => timer && clearInterval(timer), 7000);

    let frame = requestAnimationFrame(function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.fade;
        context.globalAlpha = Math.max(0, particle.life);
        context.fillStyle = particle.color;
        if (mode === "confetti") {
          particle.angle += particle.spin;
          particle.vx += Math.sin(particle.angle) * 0.03;
          context.save();
          context.translate(particle.x, particle.y);
          context.rotate(particle.angle);
          context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
          context.restore();
        } else {
          // pháo hoa: chậm dần và rơi xuống như tàn lửa, cộng sáng để chỗ chồng nhau rực lên
          particle.vx *= 0.985;
          particle.vy = particle.vy * 0.985 + 0.045;
          context.globalCompositeOperation = "lighter";
          context.drawImage(sprites.get(particle.color)!, particle.x - particle.size, particle.y - particle.size, particle.size * 2, particle.size * 2);
        }
      }
      particles = particles.filter((particle) => particle.life > 0 && particle.y < canvas.height + 30);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      frame = requestAnimationFrame(draw);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearInterval(timer);
      clearTimeout(stop);
      window.removeEventListener("resize", fit);
    };
  }, [mode]);

  // nằm trong hộp thoại để cùng lớp trên cùng của trình duyệt, phủ cả màn hình nhưng không chặn chuột
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 size-full" />;
}

export function Celebration({ level, score, maxScore, onClose }: Props) {
  const { title, line, Icon, size } = CONTENT[level];
  return (
    <Dialog open onClose={onClose} title={title}>
      {level !== "good" && <Sparks mode={level === "perfect" ? "fireworks" : "confetti"} />}
      <div className="flex flex-col items-center text-center">
        <Icon aria-hidden="true" strokeWidth={1.6} className={cx("celebrate-pop mb-3 text-brand", size)} />
        <p className={cx("font-bold", level === "good" ? "text-lg" : "text-2xl")}>{line}</p>
        <p className={cx("mb-5 mt-1 font-bold text-brand", level === "good" ? "text-3xl" : "text-5xl")}>
          {formatScore(score)}
          <span className="text-xl font-semibold text-muted"> / {formatScore(maxScore)} điểm</span>
        </p>
        <Button variant="primary" onClick={onClose} autoFocus>
          Xem kết quả
        </Button>
      </div>
    </Dialog>
  );
}
