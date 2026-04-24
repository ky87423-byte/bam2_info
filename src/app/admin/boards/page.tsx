import { getNotices, getSettings } from "@/lib/data";
import BoardManager from "./BoardManager";
import BoardPermissionsForm from "./BoardPermissionsForm";

export default function AdminBoardsPage() {
  const notices     = getNotices();
  const settings    = getSettings();
  const permissions = settings.boardPermissions;

  return (
    <div>
      <BoardPermissionsForm permissions={permissions} />
      <BoardManager initialNotices={notices} />
    </div>
  );
}
