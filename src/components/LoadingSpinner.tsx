/**
 * LoadingSpinner Component
 * 
 * A reusable loading spinner component with centered layout.
 * 
 * **Validates Requirements:**
 * - 10.5: Loading indicator is visually centered and clearly visible
 */

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message = "Loading...", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`glass p-8 text-center ${className}`}>
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6ea8ff] border-r-transparent"></div>
      <p className="mt-4 text-[#9aa3b5]">{message}</p>
    </div>
  );
}
