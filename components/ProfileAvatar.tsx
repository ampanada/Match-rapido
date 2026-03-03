interface ProfileAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

export default function ProfileAvatar({ name, avatarUrl, size = "md" }: ProfileAvatarProps) {
  const initial = (name || "U").trim().slice(0, 1).toUpperCase();
  const sizeClass = size === "lg" ? "avatar-lg" : size === "sm" ? "avatar-sm" : "avatar-md";

  if (avatarUrl) {
    return <img className={`avatar ${sizeClass}`} src={avatarUrl} alt={name || "avatar"} />;
  }

  return <div className={`avatar ${sizeClass} avatar-fallback`}>{initial}</div>;
}
