import { cx } from "./ui/cx";

// dải hành tinh cuối trang, chỉ để trang trí; các hành tinh nhỏ là phần tử riêng để CSS cho trôi chậm
export function CosmosBand({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("cosmos-band no-print overflow-hidden", className ?? "relative")}>
      <span className="planet planet-saturn" />
      <span className="planet planet-mars" />
      <span className="planet planet-moon" />
    </div>
  );
}

// sao băng bay sau nội dung trang, mỗi vệt có vị trí và nhịp riêng đặt trong CSS
export function ShootingStars() {
  return (
    <div aria-hidden="true" className="shooting-stars no-print">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

// tên lửa thỉnh thoảng bay ngang màn hình, đè lên giao diện nhưng không nhận chuột nên không cản thao tác
export function Rocket() {
  return <div aria-hidden="true" className="rocket no-print" />;
}
