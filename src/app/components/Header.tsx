import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-6">
          <Link href="/" className="flex flex-col items-center">
            <Image
              src="/CYP_logo.png"
              alt="CYP Logo"
              width={80}
              height={80}
              className="mb-2"
              priority
            />
            <h1 className="text-[2.5em] mb-[5px] font-bold text-[#007bff] text-center tracking-wide sm:text-[2em] xs:text-[1.5em]">
              Christian Youth in Power
            </h1>
          </Link>
        </div>
      </div>
    </header>
  );
}
