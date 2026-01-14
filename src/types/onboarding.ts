
import { Step } from 'react-joyride';

export interface OnboardingStep extends Step {
  target: string;
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  disableBeacon?: boolean;
}

export interface OnboardingTourProps {
  steps: OnboardingStep[];
  isActive: boolean;
  onComplete: () => void;
}
