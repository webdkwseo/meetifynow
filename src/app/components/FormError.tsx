import { CircleCheck, TriangleAlert } from "lucide-react";

type Props = {
  text: string;
  error?: boolean;
};

export const FormError = ({ text, error = false }: Props) => {
  return (
    <div
      className={
        `flex flex-row items-center w-full p-3 font-medium border rounded-lg` +
        (error
          ? " border-red text-red bg-light-red"
          : " border-green text-green bg-light-green")
      }
    >
      {error ? (
        <TriangleAlert className="mr-2 w-4 h-4" aria-hidden />
      ) : (
        <CircleCheck className="mr-2 w-4 h-4" aria-hidden />
      )}
      <span>{text}</span>
    </div>
  );
};
