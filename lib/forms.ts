import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler that runs a `useActionState` action without React's
 * automatic form reset. With `<form action={...}>`, React 19 resets the form
 * after every submission — including failed ones — which clears controlled
 * radios/selects while their state still says they're set. Submitting this
 * way keeps what the user entered when the server returns errors.
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  };
}
