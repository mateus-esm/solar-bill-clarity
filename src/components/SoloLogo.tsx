import { useTheme } from "@/hooks/useTheme";
import soloLogoDark from "@/assets/solo-logo-dark.png";
import soloLogoLight from "@/assets/solo-logo-light.png";

interface SoloLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Automatically selects the correct logo variant based on current theme.
 * - Dark mode → light-colored letterforms (visible on dark bg)
 * - Light mode → dark letterforms (visible on light bg)
 */
export function SoloLogo({ className = "h-8 w-auto", alt = "Solo Energia" }: SoloLogoProps) {
  const { isDark } = useTheme();
  return (
    <img
      src={isDark ? soloLogoDark : soloLogoLight}
      alt={alt}
      className={className}
    />
  );
}
