import { ReactNode } from "react";
import PrimaryButton from "./ui/PrimaryButton";

export default function Button(props: {
  text: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  href?: string;
}) {
  return (
    <PrimaryButton
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={props.className}
      href={props.href}
    >
      {props.text}
    </PrimaryButton>
  );
}
