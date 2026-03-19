import { create } from "zustand";
import { signupStep1Schema } from "@/lib/validations/signup";

export interface FieldErrors {
  lastName?: string;
  firstName?: string;
  email?: string;
  password?: string;
  phone?: string;
  dateOfBirth?: string;
}

interface SignupState {
  // Form data
  step: number;
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  phone: string;
  dateOfBirth: string;
  termsAgreed: boolean;

  // Validation errors
  errors: FieldErrors;

  // Actions
  setField: <K extends keyof SignupFields>(field: K, value: SignupFields[K]) => void;
  setErrors: (errors: FieldErrors) => void;
  clearErrors: () => void;
  validateStep1: () => boolean;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

type SignupFields = {
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  phone: string;
  dateOfBirth: string;
  termsAgreed: boolean;
};

const initialState = {
  step: 1,
  email: "",
  password: "",
  lastName: "",
  firstName: "",
  phone: "",
  dateOfBirth: "",
  termsAgreed: false,
  errors: {},
};

export const useSignupStore = create<SignupState>((set, get) => ({
  ...initialState,

  setField: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
      // Clear field error when user types
      errors: { ...state.errors, [field]: undefined },
    })),

  setErrors: (errors) => set({ errors }),

  clearErrors: () => set({ errors: {} }),

  validateStep1: () => {
    const state = get();
    const result = signupStep1Schema.safeParse({
      lastName: state.lastName,
      firstName: state.firstName,
      email: state.email,
      password: state.password,
      phone: state.phone,
      dateOfBirth: state.dateOfBirth,
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      set({ errors: fieldErrors });
      return false;
    }

    set({ errors: {} });
    return true;
  },

  nextStep: () => set((state) => ({ step: Math.min(3, state.step + 1) })),
  prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),

  reset: () => set(initialState),
}));
