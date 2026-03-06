interface ProfileAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const FALLBACK_PALETTES: Array<{ bg: string; border: string; text: string }> = [
  { bg: "linear-gradient(140deg, #4f8cff, #6ec3ff)", border: "#4d72b9", text: "#0f1115" },
  { bg: "linear-gradient(140deg, #ff7a8c, #ffb17f)", border: "#a8656f", text: "#1a1012" },
  { bg: "linear-gradient(140deg, #7fc77c, #8fe2b2)", border: "#5c9363", text: "#0f1612" },
  { bg: "linear-gradient(140deg, #c59aff, #8ca8ff)", border: "#7f70ad", text: "#111125" },
  { bg: "linear-gradient(140deg, #ffcf66, #ff8a73)", border: "#ad7b4b", text: "#1f1710" },
  { bg: "linear-gradient(140deg, #61d7d7, #7aa5ff)", border: "#4b8a9b", text: "#101a22" },
  { bg: "linear-gradient(140deg, #ff8fd8, #ff9f9f)", border: "#ab6f95", text: "#241117" },
  { bg: "linear-gradient(140deg, #9fd98d, #d0f07c)", border: "#789f61", text: "#13190f" }
];

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export default function ProfileAvatar({ name, avatarUrl, size = "md" }: ProfileAvatarProps) {
  const initial = (name || "U").trim().slice(0, 1).toUpperCase();
  const sizeClass = size === "lg" ? "avatar-lg" : size === "sm" ? "avatar-sm" : "avatar-md";
  const palette = FALLBACK_PALETTES[hashSeed((name || "user").trim().toLowerCase()) % FALLBACK_PALETTES.length];

  if (avatarUrl) {
    return <img className={`avatar ${sizeClass}`} src={avatarUrl} alt={name || "avatar"} />;
  }

  return (
    <div
      className={`avatar ${sizeClass} avatar-fallback`}
      style={{
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text
      }}
    >
      {initial}
    </div>
  );
}
