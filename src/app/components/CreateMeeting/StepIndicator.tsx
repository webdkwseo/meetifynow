export default function StepIndicator(props: {
  isLast?: boolean;
  isCompleted?: boolean;
  isCurrent?: boolean;
  index: number;
  shouldAnimateLine?: boolean;
}) {
  return (
    <li className="flex items-center">
      <div
        className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-2xl transition-all duration-500 ease-in-out font-bold text-sm sm:text-base ${
          props.isCompleted
            ? "bg-primary-strong text-white shadow-md shadow-primary/20 scale-100"
            : props.isCurrent
              ? "bg-primary/10 text-primary-strong border-2 border-primary scale-110 shadow-sm"
              : "bg-gray/10 text-gray/50 scale-95"
        }`}
      >
        {props.index + 1}
      </div>
      {!props.isLast && (
        <div className="relative w-8 sm:w-16 md:w-24 h-1.5 mx-2 sm:mx-3 rounded-full overflow-hidden bg-gray/10">
          <div
            className={`absolute top-0 left-0 bg-primary h-full rounded-full transition-all duration-500 ease-in-out ${
              props.isCompleted || props.shouldAnimateLine ? "w-full" : "w-0"
            }`}
          ></div>
        </div>
      )}
    </li>
  );
}
