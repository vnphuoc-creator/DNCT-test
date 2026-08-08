// Máy bay bay ngang nền bầu trời — dùng ảnh thật (độ phân giải cao) thay vì
// hình vẽ giản lược. Đặt cố định phía sau nội dung, chuyển động chậm rãi.
export default function FlyingPlane() {
  return (
    <div className="plane-track" aria-hidden="true">
      <img src="/plane.png" alt="" className="plane-img" />
    </div>
  );
}
