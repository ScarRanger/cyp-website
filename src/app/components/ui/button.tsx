"use client";

import * as React from "react";
const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  asChild?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-400 ring-offset-white",
      outline:
        "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 focus-visible:ring-sky-300 ring-offset-white",
      ghost:
        "bg-transparent text-sky-700 hover:bg-sky-50 focus-visible:ring-sky-300 ring-offset-white",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    };

    const classes = cn(base, variants[variant], sizes[size], className);

    if (asChild && React.isValidElement(children)) {
      // Do not forward the button ref to non-button elements to keep typing simple
      const childEl = children as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(childEl, {
        className: cn((childEl.props?.className as string | undefined) ?? '', classes),
        ...(props as Record<string, unknown>),
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
