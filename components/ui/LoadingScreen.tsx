import Image from 'next/image';

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <Image
            src="/logo.gif"
            alt="blob.you logo"
            width={128}
            height={128}
            priority
            unoptimized
            className="object-contain"
          />
        </div>
        <p className="text-white/70 text-sm">Loading...</p>
      </div>
    </div>
  );
}

