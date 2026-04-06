import { useEffect, useState } from 'react';

interface UserAvatarProps {
  label: string;
  email: string;
  imageUrl?: string | null;
  sizeClass?: string;
}

export const UserAvatar = ({
  label,
  email,
  imageUrl,
  sizeClass = 'h-10 w-10 text-sm',
}: UserAvatarProps) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);
  const initial = (email[0] ?? label[0] ?? '?').toUpperCase();
  const showImg = Boolean(imageUrl) && !broken;

  if (showImg) {
    return (
      <img
        src={imageUrl!}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-slate-100`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700 ${sizeClass}`}
      aria-hidden
    >
      {initial}
    </div>
  );
};
