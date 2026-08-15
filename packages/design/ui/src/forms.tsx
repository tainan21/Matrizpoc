import {
  createContext,
  forwardRef,
  useContext,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react"

import { cn } from "@matriz/foundation-utils"

interface FieldContextValue {
  id: string
  describedBy?: string
  errorMessageId?: string
  invalid: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  function Label({ className, ...props }, ref) {
    return <label ref={ref} className={cn("matriz-label", className)} {...props} />
  },
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(
    {
      id,
      className,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
      "aria-invalid": invalid,
      ...props
    },
    ref,
  ) {
    const field = useContext(FieldContext)
    const descriptions = [describedBy, field?.describedBy].filter(Boolean).join(" ") || undefined

    return (
      <input
        ref={ref}
        id={field?.id ?? id}
        className={cn("matriz-input", className)}
        aria-describedby={descriptions}
        aria-errormessage={errorMessage ?? field?.errorMessageId}
        aria-invalid={invalid ?? (field?.invalid || undefined)}
        {...props}
      />
    )
  },
)

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  id: string
  label: ReactNode
  helper?: ReactNode
  error?: ReactNode
  children: ReactNode
}

export function FormField({
  id,
  label,
  helper,
  error,
  children,
  className,
  ...props
}: FormFieldProps) {
  const helperId = helper ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <FieldContext.Provider
      value={{ id, describedBy, errorMessageId: errorId, invalid: Boolean(error) }}
    >
      <div className={cn("matriz-form-field", className)} {...props}>
        <Label htmlFor={id}>{label}</Label>
        {children}
        {helper ? (
          <div id={helperId} className="matriz-form-field__helper">
            {helper}
          </div>
        ) : null}
        {error ? (
          <div
            id={errorId}
            className="matriz-form-field__error"
            role="status"
            aria-live="polite"
          >
            {error}
          </div>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}
