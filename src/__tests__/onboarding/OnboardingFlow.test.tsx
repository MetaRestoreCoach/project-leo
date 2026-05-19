// ============================================================
// OnboardingFlow — component integration tests (25)
// ============================================================

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { DEFAULT_ONBOARDING_CONFIG } from '@/config/onboardingConfig';
import type { OnboardingConfig } from '@/config/onboardingConfig';
import type { OnboardingService, UserPreferences } from '@/services/onboardingService';

// ── Mock react-native-svg ─────────────────────────────────────────────────
jest.mock('react-native-svg', () => {
  const { View, Text } = require('react-native');
  const Svg = ({ children, accessibilityLabel, ...props }: any) => (
    <View accessibilityRole="img" accessibilityLabel={accessibilityLabel} {...props}>
      {children}
    </View>
  );
  const noop = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Polygon: noop,
    Circle: noop,
    Line: noop,
    Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    G: noop,
  };
});

// ── Mock @react-native-community/slider ──────────────────────────────────
jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ accessibilityLabel, ...props }: any) => (
      <View accessibilityLabel={accessibilityLabel} {...props} />
    ),
  };
});

// ── Mock expo-router (useWindowDimensions used inside OnboardingShell) ────
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  default: () => ({ width: 375, height: 812 }),
}));

// ---------------------------------------------------------------------------
// Minimal config with 2 questions + wheel
// ---------------------------------------------------------------------------

const MINI_CONFIG: OnboardingConfig = {
  ...DEFAULT_ONBOARDING_CONFIG,
  steps: [
    {
      id: 'goals',
      type: 'multitext',
      question: 'What are your goals?',
      hint: null,
      placeholder: 'Goal 1',
      minItems: 1,
      maxItems: 2,
      required: true,
    },
    {
      id: 'sleep',
      type: 'textarea',
      question: 'Describe your sleep.',
      hint: null,
      placeholder: 'e.g. 7 hours...',
      maxLength: 300,
      required: true,
    },
  ],
};

function makeMockService(saveResult: Partial<UserPreferences> = {}): OnboardingService {
  return {
    getConfig: jest.fn(async () => MINI_CONFIG),
    savePreferences: jest.fn(async () => ({
      uid: 'u1',
      onboardingVersion: '1.0.0',
      completedAt: new Date().toISOString(),
      responses: {},
      wellnessScores: {
        scores: {},
        assessedAt: new Date().toISOString(),
        nextAssessmentDue: new Date().toISOString(),
      },
      focusAreas: [],
      ...saveResult,
    })),
    loadPreferences: jest.fn(async () => null),
    isComplete: jest.fn(async () => false),
    getMIPrompt: jest.fn(() => 'Some MI prompt'),
  };
}

function renderFlow(overrides: Partial<React.ComponentProps<typeof OnboardingFlow>> = {}) {
  const defaults: React.ComponentProps<typeof OnboardingFlow> = {
    config: MINI_CONFIG,
    onComplete: jest.fn(),
    service: makeMockService(),
    uid: 'user_test_1',
    loading: false,
    error: null,
  };
  return render(<OnboardingFlow {...defaults} {...overrides} />);
}

// ---------------------------------------------------------------------------
describe('OnboardingFlow — loading and error states', () => {
  test('shows loading indicator when loading=true', () => {
    renderFlow({ loading: true });
    expect(screen.getByTestId('onboarding-loading')).toBeTruthy();
  });

  test('shows error message when error is set', () => {
    renderFlow({ error: 'Fetch failed' });
    expect(screen.getByTestId('onboarding-error')).toBeTruthy();
    expect(screen.getByText(/Could not load onboarding/i)).toBeTruthy();
  });

  test('shows flow when loading=false and error=null', () => {
    renderFlow();
    expect(screen.getByTestId('onboarding-flow')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('OnboardingFlow — step navigation', () => {
  test('shows first question text on mount', () => {
    renderFlow();
    expect(screen.getByText('What are your goals?')).toBeTruthy();
  });

  test('Back button is disabled on step 1 (not rendered)', () => {
    renderFlow();
    // OnboardingShell only renders Back when onBack is defined
    expect(screen.queryByTestId('btn-back')).toBeNull();
  });

  test('Next button is present on question steps', () => {
    renderFlow();
    expect(screen.getByTestId('btn-next')).toBeTruthy();
  });

  test('clicking Next without filling required field shows error', () => {
    renderFlow();
    fireEvent.press(screen.getByTestId('btn-next'));
    expect(screen.getByText(/Please enter at least/i)).toBeTruthy();
  });

  test('clicking Next with required field filled advances to step 2', () => {
    renderFlow();
    const inputs = screen.getAllByPlaceholderText(/goal 1/i);
    fireEvent.changeText(inputs[0], 'Lose weight');
    fireEvent.press(screen.getByTestId('btn-next'));
    expect(screen.getByText('Describe your sleep.')).toBeTruthy();
  });

  test('Back button is visible on step 2', () => {
    renderFlow();
    const inputs = screen.getAllByPlaceholderText(/goal 1/i);
    fireEvent.changeText(inputs[0], 'Lose weight');
    fireEvent.press(screen.getByTestId('btn-next'));
    expect(screen.getByTestId('btn-back')).toBeTruthy();
  });

  test('clicking Back returns to previous step', () => {
    renderFlow();
    const inputs = screen.getAllByPlaceholderText(/goal 1/i);
    fireEvent.changeText(inputs[0], 'Lose weight');
    fireEvent.press(screen.getByTestId('btn-next'));
    fireEvent.press(screen.getByTestId('btn-back'));
    expect(screen.getByText('What are your goals?')).toBeTruthy();
  });

  test('shows wellness wheel on final step (after all questions)', () => {
    renderFlow();
    // Step 1
    const inputs = screen.getAllByPlaceholderText(/goal 1/i);
    fireEvent.changeText(inputs[0], 'Goal A');
    fireEvent.press(screen.getByTestId('btn-next'));
    // Step 2
    const textarea = screen.getByPlaceholderText(/7 hours/i);
    fireEvent.changeText(textarea, 'Sleep 7 hours');
    fireEvent.press(screen.getByTestId('btn-next'));
    // Wheel step
    expect(screen.getByTestId('wellness-wheel')).toBeTruthy();
    expect(screen.getByTestId('btn-submit')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('OnboardingFlow — completion', () => {
  test('Submit button calls service.savePreferences with uid', async () => {
    const service = makeMockService();
    const onComplete = jest.fn();
    render(
      <OnboardingFlow
        config={MINI_CONFIG}
        onComplete={onComplete}
        service={service}
        uid="u99"
        loading={false}
        error={null}
      />,
    );
    // Navigate to wheel
    fireEvent.changeText(screen.getAllByPlaceholderText(/goal 1/i)[0], 'Goal A');
    fireEvent.press(screen.getByTestId('btn-next'));
    fireEvent.changeText(screen.getByPlaceholderText(/7 hours/i), 'OK');
    fireEvent.press(screen.getByTestId('btn-next'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit'));
    });

    expect(service.savePreferences).toHaveBeenCalledWith(
      'u99',
      expect.any(Object),
      expect.any(Object),
      MINI_CONFIG,
    );
  });

  test('onComplete callback is called after successful save', async () => {
    const service = makeMockService({ focusAreas: ['sleep'] });
    const onComplete = jest.fn();
    render(
      <OnboardingFlow
        config={MINI_CONFIG}
        onComplete={onComplete}
        service={service}
        uid="u1"
        loading={false}
        error={null}
      />,
    );
    fireEvent.changeText(screen.getAllByPlaceholderText(/goal 1/i)[0], 'Goal A');
    fireEvent.press(screen.getByTestId('btn-next'));
    fireEvent.changeText(screen.getByPlaceholderText(/7 hours/i), 'OK');
    fireEvent.press(screen.getByTestId('btn-next'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit'));
    });

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
describe('OnboardingFlow — progress tracking', () => {
  test('shows step 1 of totalSteps on mount', () => {
    renderFlow();
    const totalSteps = MINI_CONFIG.steps.length + 1;
    expect(screen.getByText(`Step 1 of ${totalSteps}`)).toBeTruthy();
  });

  test('step label updates when advancing', () => {
    renderFlow();
    fireEvent.changeText(screen.getAllByPlaceholderText(/goal 1/i)[0], 'Goal A');
    fireEvent.press(screen.getByTestId('btn-next'));
    expect(screen.getByText(`Step 2 of ${MINI_CONFIG.steps.length + 1}`)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('OnboardingFlow — select step', () => {
  const SELECT_CONFIG: OnboardingConfig = {
    ...DEFAULT_ONBOARDING_CONFIG,
    steps: [
      {
        id: 'balance',
        type: 'select',
        question: 'Rate your balance',
        hint: null,
        required: true,
        options: [
          { value: 'yes', label: 'Good' },
          { value: 'no', label: 'Struggling' },
        ],
      },
    ],
  };

  test('select options are rendered', () => {
    const service = makeMockService();
    render(
      <OnboardingFlow
        config={SELECT_CONFIG}
        onComplete={jest.fn()}
        service={service}
        uid="u5"
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText('Good')).toBeTruthy();
    expect(screen.getByText('Struggling')).toBeTruthy();
  });

  test('pressing Next without selecting shows error', () => {
    const service = makeMockService();
    render(
      <OnboardingFlow
        config={SELECT_CONFIG}
        onComplete={jest.fn()}
        service={service}
        uid="u6"
        loading={false}
        error={null}
      />,
    );
    fireEvent.press(screen.getByTestId('btn-next'));
    expect(screen.getByText(/Please select an option/i)).toBeTruthy();
  });

  test('selecting an option clears error and advances', () => {
    const service = makeMockService();
    render(
      <OnboardingFlow
        config={SELECT_CONFIG}
        onComplete={jest.fn()}
        service={service}
        uid="u7"
        loading={false}
        error={null}
      />,
    );
    fireEvent.press(screen.getByText('Good'));
    fireEvent.press(screen.getByTestId('btn-next'));
    // Should be on wheel step
    expect(screen.getByTestId('wellness-wheel')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('OnboardingFlow — config null', () => {
  test('shows error state when config is null', () => {
    renderFlow({ config: null });
    expect(screen.getByTestId('onboarding-error')).toBeTruthy();
  });
});
