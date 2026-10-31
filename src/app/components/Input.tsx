import React from "react";

type Props = {
  label: string;
  type: string;
  id: string;
  name: string;
  register: any;
  placeholder: string;
  options?: any;
  errorText?: string | undefined | null;
  error?: boolean;
  value?: string;
  required?: boolean | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autocomplete?: string;
};

const Input = ({
  label,
  type,
  id,
  name,
  register,
  placeholder,
  options,
  error,
  errorText,
  onChange,
  value,
  required = false,
  disabled = false,
  autocomplete = "off",
}: Props) => {
  return (
    <div className="flex flex-col w-full gap-2 relative z-0">
      <div className="flex justify-between">
        <label htmlFor={id} className="font-medium text-gray-600">
          {label}
          {required && (
            <span className="text-red-600" aria-hidden>
              *
            </span>
          )}
        </label>
      </div>
      <input
        id={id}
        name={name}
        {...register(id, { ...options })}
        type={type}
        aria-invalid={error || undefined}
        aria-describedby={errorText ? `${id}-error` : undefined}
        className={
          `w-full p-4 text-dark font-medium bg-white border border-dark/10 rounded-2xl placeholder-gray-400 transition-all duration-300 outline-none ` +
          "focus:ring-4 focus:ring-primary/20 focus:border-primary/40 hover:border-dark/20 shadow-sm " +
          (error ? "border-red focus:ring-red/20" : "")
        }
        placeholder={placeholder}
        onChange={onChange}
        value={value}
        autoComplete={autocomplete}
        required={required}
        disabled={disabled}
      />
      <p
        id={`${id}-error`}
        role={errorText ? "alert" : undefined}
        className="text-sm relative -top-1 text-red-600 font-medium"
      >
        {errorText}
      </p>
    </div>
  );
};

export default Input;
