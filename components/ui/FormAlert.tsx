interface FormAlertProps {
  message: string;
  type?: 'error' | 'success';
}

/**
 * Reusable alert component for form feedback
 * Displays error or success messages with consistent styling
 */
export function FormAlert({ message, type = 'error' }: FormAlertProps) {
  if (!message) return null;

  const styles = {
    error: 'bg-red-50 text-red-600 border-red-200',
    success: 'bg-green-50 text-green-600 border-green-200',
  };

  return (
    <div 
      role="alert"
      className={`p-sm rounded-md text-sm border ${styles[type]}`}
    >
      {message}
    </div>
  );
}

