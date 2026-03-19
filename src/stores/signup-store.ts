import { create } from "zustand";

interface SignupState {
  step: number;
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  phone: string;
  dateOfBirth: string;
  termsAgreed: boolean;
  setField: (field: string, value: string | boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

export const useSignupStore = create<SignupState>((set) => ({
  step: 1,
  email: "",
  password: "",
  lastName: "",
  firstName: "",
  phone: "",
  dateOfBirth: "",
  termsAgreed: false,
  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
  nextStep: () => set((state) => ({ step: state.step + 1 })),
  prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
  reset: () =>
    set({
      step: 1,
      email: "",
      password: "",
      lastName: "",
      firstName: "",
      phone: "",
      dateOfBirth: "",
      termsAgreed: false,
    }),
}));
