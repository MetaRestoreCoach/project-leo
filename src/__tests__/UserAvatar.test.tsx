// ============================================================
// UserAvatar — component tests
// ============================================================

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UserAvatar } from '@/components/common/UserAvatar';

// Mock theme constants so the component renders without native font loading
jest.mock('@/constants/theme', () => ({
  Colors: { primary: '#4F46E5', white: '#FFFFFF' },
  FontWeight: { bold: '700' },
}));

describe('UserAvatar', () => {
  // ── Initial fallback ───────────────────────────────────
  describe('initial fallback (no avatarUrl)', () => {
    it('renders the first uppercase letter of name', () => {
      const { getByText } = render(<UserAvatar name="Kiran" />);
      expect(getByText('K')).toBeTruthy();
    });

    it('falls back to "U" when name is empty', () => {
      const { getByText } = render(<UserAvatar name="" />);
      expect(getByText('U')).toBeTruthy();
    });

    it('falls back to "U" when name is undefined', () => {
      const { getByText } = render(<UserAvatar />);
      expect(getByText('U')).toBeTruthy();
    });

    it('uses uppercase of first character', () => {
      const { getByText } = render(<UserAvatar name="alex" />);
      expect(getByText('A')).toBeTruthy();
    });
  });

  // ── Image rendering ────────────────────────────────────
  describe('image rendering', () => {
    it('renders an Image when avatarUrl is provided', () => {
      const { getByTestId, queryByText } = render(
        <UserAvatar name="Kiran" avatarUrl="https://example.com/avatar.jpg" />,
      );
      // Image is rendered, initial text is not
      // (React Native Image has no testID by default — check absence of initial)
      expect(queryByText('K')).toBeNull();
    });

    it('shows initial fallback when image fails to load', () => {
      const { getByText, UNSAFE_getByType } = render(
        <UserAvatar name="Kiran" avatarUrl="https://example.com/bad.jpg" />,
      );

      // Simulate onError
      const { Image } = require('react-native');
      const image = UNSAFE_getByType(Image);
      fireEvent(image, 'error');

      expect(getByText('K')).toBeTruthy();
    });

    it('shows initial when avatarUrl is null', () => {
      const { getByText } = render(<UserAvatar name="Test" avatarUrl={null} />);
      expect(getByText('T')).toBeTruthy();
    });
  });

  // ── Size prop ──────────────────────────────────────────
  describe('size prop', () => {
    it('defaults to 40px', () => {
      const { UNSAFE_getByProps } = render(<UserAvatar name="A" />);
      const container = UNSAFE_getByProps({ style: expect.arrayContaining([expect.objectContaining({ width: 40 })]) });
      expect(container).toBeTruthy();
    });

    it('applies custom size', () => {
      const { UNSAFE_getByProps } = render(<UserAvatar name="A" size={80} />);
      const container = UNSAFE_getByProps({ style: expect.arrayContaining([expect.objectContaining({ width: 80, height: 80 })]) });
      expect(container).toBeTruthy();
    });
  });

  // ── Border ────────────────────────────────────────────
  describe('borderColor prop', () => {
    it('applies borderWidth and borderColor when borderColor is set', () => {
      const { UNSAFE_getByProps } = render(<UserAvatar name="A" borderColor="#FF0000" />);
      const container = UNSAFE_getByProps({ style: expect.arrayContaining([expect.objectContaining({ borderColor: '#FF0000', borderWidth: 2 })]) });
      expect(container).toBeTruthy();
    });

    it('does not apply border when borderColor is omitted', () => {
      const { UNSAFE_getByProps } = render(<UserAvatar name="A" />);
      // Should not find an element with borderWidth set
      const containers = UNSAFE_getByProps({ style: expect.anything() });
      const hasBorder = JSON.stringify(containers.props.style).includes('"borderWidth":2');
      expect(hasBorder).toBe(false);
    });
  });
});
