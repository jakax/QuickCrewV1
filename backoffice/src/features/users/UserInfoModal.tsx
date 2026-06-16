import React from "react";

type Skill = {
  id: string;
  name: string;
};

type UserInfoModalProps = {
  user: {
    fullName?: string;
    email?: string;
    role?: string;
    approvalStatus?: string;
    createdAt?: any;
    skills?: string[];
  } | null;
  skillsMap: Record<string, string>;
  onClose: () => void;
};

function asDateMaybe(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
  if (v instanceof Date) return v;
  return null;
}

function fmtShort(d: Date | null): string {
  if (!d) return "—";
  try {
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

export default function UserInfoModal({ user, skillsMap, onClose }: UserInfoModalProps) {
  if (!user) return null;

  const createdAt = fmtShort(asDateMaybe(user.createdAt));
  const skills = Array.isArray(user.skills) && user.skills.length
    ? user.skills.map((id) => skillsMap[id] || id).join(", ")
    : "—";

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="card modalCard">
        <div className="cardBody">
          <div className="row rowBetween">
            <div className="fw900 fs16">{user.fullName || "Unnamed"}</div>
            <button className="btn" onClick={onClose}>Close</button>
          </div>

          <div className="mt16">
            <div className="muted fs12 fw800">Email</div>
            <div className="fw800 mt4">{user.email || "—"}</div>
          </div>

          <div className="mt12">
            <div className="muted fs12 fw800">Role</div>
            <div className="fw800 mt4">{user.role || "—"}</div>
          </div>

          <div className="mt12">
            <div className="muted fs12 fw800">Status</div>
            <div className="fw800 mt4">{user.approvalStatus || "—"}</div>
          </div>

          <div className="mt12">
            <div className="muted fs12 fw800">Member since</div>
            <div className="fw800 mt4">{createdAt}</div>
          </div>

          <div className="mt12">
            <div className="muted fs12 fw800">Skills</div>
            <div className="fw800 mt4">{skills}</div>
          </div>

          <div className="muted fs12 fw800 mt16">
            To review full profile, documents and history — set user to pending.
          </div>
        </div>
      </div>
    </div>
  );
}