import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/common/components/ui/avatar';

interface Props {
  src: string;
  alt: string;
  fallback: string;
}

export function UserAvatar({ src, alt, fallback }: Props) {
  return (
    <Avatar>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
