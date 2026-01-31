import { useEffect, useState } from 'react';
import { GlassElement } from '@/common/components/liquid-glass/GlassElement';
import { Button } from '@/common/components/ui/button';

// Dynamic imports for dev-only assets
const loadImages = async () => {
  const [img1, img2, img3, img4, img5] = await Promise.all([
    import('@/assets/images/dev/AS11-40-5865HR.png'),
    import('@/assets/images/dev/AS11-40-5872HR.png'),
    import('@/assets/images/dev/AS11-40-5877HR.png'),
    import('@/assets/images/dev/AS11-40-5899HR.png'),
    import('@/assets/images/dev/AS11-40-5902HR.png'),
  ]);
  return [img1.default, img2.default, img3.default, img4.default, img5.default];
};

export function GlassDev() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    loadImages().then(setImages);
  }, []);

  if (images.length === 0) {
    return (
      <div className="bg-black text-white flex items-center justify-center h-screen">
        <p>Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white pb-[50vh] overflow-auto">
      {/* Animated overlay with glass elements */}
      <div className="fixed inset-0 flex flex-wrap gap-10 justify-center items-center content-center w-screen h-screen z-10">
        <GlassElement maxWidth={150} maxHeight={52} radius={12}>
          <Button
            size="xl"
            className="bg-transparent border-0 text-foreground hover:bg-transparent rounded-xl"
          >
            Some button
          </Button>
        </GlassElement>

        <GlassElement maxWidth={200} maxHeight={200} radius={50} strength={100}>
          <div className="h-[200px] rounded-[50px]" />
        </GlassElement>

        <GlassElement
          maxWidth={200}
          maxHeight={200}
          radius={20}
          blur={1}
          strength={100}
          chromaticAberration={1}
        >
          <div className="h-[200px] rounded-[20px]" />
        </GlassElement>

        <GlassElement
          maxWidth={200}
          maxHeight={200}
          radius={100}
          blur={4}
          strength={100}
          chromaticAberration={0}
        >
          <div className="h-[200px] rounded-full" />
        </GlassElement>
      </div>

      {/* Background content */}
      <img src={images[0]} alt="" className="w-full h-auto" />
      <img src={images[1]} alt="" className="w-full h-auto" />
      <img src={images[2]} alt="" className="w-full h-auto" />
      <img src={images[3]} alt="" className="w-full h-auto" />
      <img src={images[4]} alt="" className="w-full h-auto" />
      <p className="p-8 text-lg leading-relaxed">
        Sample text content for testing the liquid glass effect overlay. This
        creates background content that the glass elements can distort and
        refract, showing the visual effect of the backdrop filter
        implementation. The glass elements should appear to bend and distort the
        content beneath them while maintaining proper transparency and chromatic
        aberration.
      </p>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes move {
            0% {
              transform: translateY(10vh);
            }
            100% {
              transform: translateY(-10vh);
            }
          }
        `,
        }}
      />
    </div>
  );
}
