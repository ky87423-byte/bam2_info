import { getCoupons, getUsers, getSettings } from "@/lib/data";
import CouponManager from "./CouponManager";

export default function AdminCouponsPage() {
  const coupons   = getCoupons();
  const settings  = getSettings();
  const { users } = getUsers("", 1, 9999);
  const shopUsers = users.filter((u) => u.role === "shop" && u.status === "active");
  return (
    <CouponManager
      initialCoupons={coupons}
      shopUsers={shopUsers}
      menuCouponVisible={settings.menuCouponVisible}
      menuEventVisible={settings.menuEventVisible}
    />
  );
}
