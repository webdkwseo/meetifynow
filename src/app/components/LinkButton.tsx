import Link from "next/link";

type LinkButtonProps = {
  href: string;
  text: string;
  className?: string;
  target?: string;
};

export const LinkButton = ({
  href,
  text,
  className,
  target = "_blank",
}: LinkButtonProps) => {
  return (
    <Link
      href={href}
      target={target}
      className={`relative inline-flex items-center justify-center font-medium text-primary-strong hover:text-dark active:text-dark transition-all duration-300 group ${className}`}
    >
      <span className="relative z-10">{text}</span>
      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#0096E0] transition-all duration-300 ease-out group-hover:w-full"></span>
    </Link>
  );
};
