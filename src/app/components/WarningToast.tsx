import { TriangleAlert } from "lucide-react";

type Props = {
  text: string;
};

export const WarningToast = ({ text }: Props) => {
  return (
    <div
      className={`flex flex-row items-center w-full p-3 font-medium border rounded-lg border-yellow-600 text-yellow-600 bg-yellow-100`}
    >
      <TriangleAlert className="mr-2 w-4 h-4" aria-hidden />
      <span>{text}</span>
    </div>
  );
};
