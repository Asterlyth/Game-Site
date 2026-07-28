import { useId } from "react";

interface SpriteAnimationProps {
  src: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  frameDuration: number;
  className?: string;
}

export default function SpriteAnimation({
  src,
  frameCount,
  frameWidth,
  frameHeight,
  frameDuration,
  className,
}: SpriteAnimationProps) {
  const animationName = `sprite-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const totalDuration = frameCount * frameDuration;

  return (
    <>
      <div
        className={className}
        role="img"
        aria-label="animated sprite"
        style={{
          width: frameWidth,
          height: frameHeight,
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "0 0",
          imageRendering: "pixelated",
          animation: `${animationName} ${totalDuration}ms steps(${frameCount}) infinite`,
        }}
      />
      <style>{`
        @keyframes ${animationName} {
          from { background-position: 0 0; }
          to { background-position: -${frameWidth * frameCount}px 0; }
        }
      `}</style>
    </>
  );
}
